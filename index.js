const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
  downloadContentFromMessage,
  fetchLatestWaWebVersion
} = require("@adiwajshing/baileys");
const fs = require("fs");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const PhoneNumber = require("awesome-phonenumber");
const readline = require("readline");

const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

const usePairingCode = true
const question = (text) => {
  const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
  });
  return new Promise((resolve) => {
rl.question(text, resolve)
  })
};

const smsg = (indrx, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = indrx.decodeJid(m.fromMe && indrx.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = indrx.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0]
			m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
				type = Object.keys(m.quoted)[0]
				m.quoted = m.quoted[type]
			}
            if (typeof m.quoted === 'string') m.quoted = {
				text: m.quoted
			}
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
			m.quoted.sender = indrx.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === indrx.decodeJid(indrx.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
			if (!m.quoted.id) return false
			let q = await store.loadMessage(m.chat, m.quoted.id, indrx)
 			return exports.smsg(indrx, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            m.quoted.delete = () => indrx.sendMessage(m.quoted.chat, { delete: vM.key })
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => indrx.copyNForward(jid, vM, forceForward, options)
            m.quoted.download = () => indrx.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg.url) m.download = () => indrx.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? indrx.sendMedia(chatId, text, 'file', '', m, { ...options }) : indrx.sendText(chatId, text, m, { ...options })
	m.copy = () => exports.smsg(indrx, M.fromObject(M.toObject(m)))
	m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => indrx.copyNForward(jid, m, forceForward, options)
	indrx.appenTextMessage = async(text, chatUpdate) => {
        let messages = await generateWAMessage(m.chat, { text: text, mentions: m.mentionedJid }, {
            userJid: indrx.user.id,
            quoted: m.quoted && m.quoted.fakeObj
        })
        messages.key.fromMe = areJidsSameUser(m.sender, indrx.user.id)
        messages.key.id = m.key.id
        messages.pushName = m.pushName
        if (m.isGroup) messages.participant = m.sender
        let msg = {
            ...chatUpdate,
            messages: [proto.WebMessageInfo.fromObject(messages)],
            type: 'append'
        }
        indrx.ev.emit('messages.upsert', msg)
    }

    return m
}

async function startBotz() {
const { state, saveCreds } = await useMultiFileAuthState("session")
const indrx = makeWASocket({
logger: pino({ level: "silent" }),
printQRInTerminal: !usePairingCode,
auth: state,
browser: ["Ubuntu", "Chrome", "20.0.04"],
});
if(usePairingCode && !indrx.authState.creds.registered) {
		const phoneNumber = await question('Masukan Nomer Yang Aktif Awali Dengan 62 Recode :\n');
		const code = await indrx.requestPairingCode(phoneNumber.trim())
		console.log(`Pairing code: ${code}`)

	}

  store.bind(indrx.ev);

  indrx.ev.on("messages.upsert", async (chatUpdate) => {
       try {
          const mek = chatUpdate.messages[0]
          if (!mek.message) return
          mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
          if (mek.key && mek.key.remoteJid === 'status@broadcast'){
          if (autoread_status) { await indrx.readMessages([mek.key]) }} 
          if (!indrx.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
          if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
          const m = smsg(indrx, mek, store)
          require("./case")(indrx, m, chatUpdate, store)
       } catch (err) {
         console.log(err)
     }
  });

  // Setting
  indrx.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  indrx.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = indrx.decodeJid(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    }
  });

  indrx.getName = (jid, withoutContact = false) => {
    id = indrx.decodeJid(jid);
    withoutContact = indrx.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = indrx.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === indrx.decodeJid(indrx.user.id)
          ? indrx.user
          : store.contacts[id] || {};
    return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
  };

  indrx.public = true;

  indrx.serializeM = (m) => smsg(indrx, m, store);
  indrx.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        startBotz();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        startBotz();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");
        startBotz();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
        startBotz();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Delete Folder Session yusril and Scan Again.`);
        startBotz();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        startBotz();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        startBotz();
      } else {
        console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        startBotz();
      } 
      } else if (connection === 'connecting') {
        
      } else if (connection === "open") {
        indrx.sendMessage(indrx.user.id, { text: `Bot Connected` });
      }
  });

  indrx.ev.on("creds.update", saveCreds);
  indrx.sendText = (jid, text, quoted = "", options) => indrx.sendMessage(jid, { text: text, ...options }, { quoted });
  return indrx;
}

startBotz();

//batas
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(`Update ${__filename}`)
    delete require.cache[file]
    require(file)
})
