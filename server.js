import 'dotenv/config'
import express from 'express'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import pino from 'pino'

const PORT = process.env.PORT || 3001
const AUTH_TOKEN = process.env.AUTH_TOKEN // segredo compartilhado entre app e worker
const AUTH_DIR = process.env.AUTH_DIR || 'auth_info' // aponte pro volume persistente em produção

let sock
let isReady = false

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('ListaDesejos'),
    logger: pino({ level: 'silent' }),
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n📱 Escaneie o QR abaixo no WhatsApp (Aparelhos conectados):\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      isReady = true
      console.log('✅ Conectado ao WhatsApp')
    }

    if (connection === 'close') {
      isReady = false
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const deslogado = code === DisconnectReason.loggedOut
      console.log(`⚠️  Conexão fechada (code ${code}).`)
      if (deslogado) {
        console.log(`Sessão encerrada. Apague a pasta "${AUTH_DIR}" e reinicie pra gerar novo QR.`)
      } else {
        console.log('Reconectando...')
        startSock()
      }
    }
  })
}

// transforma "44 99999-9999" / "+5544999999999" em JID do WhatsApp
function toDigits(phone) {
  return String(phone).replace(/\D/g, '')
}

const app = express()
app.use(express.json())

// healthcheck sem token (pro Railway/Render monitorarem)
app.get('/status', (req, res) => {
  res.json({ connected: isReady })
})

// auth simples por header
function requireAuth(req, res, next) {
  if (!AUTH_TOKEN || req.headers['x-auth-token'] !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'não autorizado' })
  }
  next()
}

app.post('/send', requireAuth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'whatsapp não conectado' })

  const { phone, message } = req.body || {}
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message são obrigatórios' })
  }

  try {
    const digits = toDigits(phone)
    // confirma que o número tem WhatsApp e pega o JID correto
    const [info] = await sock.onWhatsApp(`${digits}@s.whatsapp.net`)
    if (!info?.exists) {
      return res.status(404).json({ error: 'número não tem WhatsApp', phone })
    }

    await sock.sendMessage(info.jid, { text: message })
    res.json({ ok: true, jid: info.jid })
  } catch (err) {
    console.error('Erro ao enviar:', err)
    res.status(500).json({ error: 'falha ao enviar' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Worker WhatsApp na porta ${PORT}`)
  startSock()
})
