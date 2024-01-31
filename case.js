require("./settings")
const { exec, spawn, execSync } = require("child_process")
const fs = require('fs')
const util = require('util')
const { performance } = require("perf_hooks"); 


module.exports = indrx = async (indrx, m, chatUpdate, store) => {
try {
var body = (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
var budy = (typeof m.text == 'string' ? m.text : '')
var prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : "/"
const isCmd = body.startsWith(prefix)
const command = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase()
const args = body.trim().split(/ +/).slice(1)
const pushname = m.pushName || "No Name"
const botNumber = await client.decodeJid(client.user.id)
const itsMe = m.sender == botNumber ? true : false
let text = q = args.join(" ")

//detec message 
if (isCmd && m.isGroup) {
console.log(`\n▧ ───────···`);
console.log(`│⌲ 𝙶𝚁𝙾𝚄𝙿 𝙲𝙷𝙰𝚃 :`);
console.log(`│⌲ [ PESAN ]`, budy || m.mtype, '\n│⌲ 🎉 𝙳𝙰𝚁𝙸', m.sender, '\n│❑ => 𝙸𝙽', groupName, m.chat);
console.log(`▧ ───────···`);
} else {
console.log(`\n▧ ───────···`);
console.log(`│⌲ 𝙿𝚁𝙸𝚅𝙰𝚃𝙴 𝙲𝙷𝙰𝚃 :`);
console.log(`│⌲ [ PESAN ]`, budy || m.mtype, '\n│⌲ 👀 𝙽𝚄𝙼𝙱𝙴𝚁', m.sender);
console.log(`▧ ───────···`);
}

switch(command) {
if (itsMe) return
case"ping":{
 var old = performance.now(); 
 var neww = performance.now(); 
 var speed = neww - old; 
reply(`Speed : ${speed} Second`)
}
break
default:
if (budy.startsWith('=>')) {
if (!itsMe) return
function Return(sul) {
sat = JSON.stringify(sul, null, 2)
bang = util.format(sat)
if (sat == undefined) {
bang = util.format(sul)}
return reply(bang)}
try {
reply(util.format(eval(`(async () => { return ${budy.slice(3)} })()`)))
} catch (e) {
reply(String(e))}}
if (budy.startsWith('>')) {
if (!itsMe) return
try {
let evaled = await eval(budy.slice(2))
if (typeof evaled !== 'string') evaled = require('util').inspect(evaled)
await reply(evaled)
} catch (err) {
await reply(String(err))}}
if (budy.startsWith('$')) {
if (!itsMe) return
exec(budy.slice(2), (err, stdout) => {
if(err) return reply(err)
if (stdout) return reply(stdout)})}
}
} catch (err) {
m.reply(util.format(err))
}
}
let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(`Update ${__filename}`)
delete require.cache[file]
require(file)
})
