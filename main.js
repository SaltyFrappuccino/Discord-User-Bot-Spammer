const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();
const colors = require('colors');
const config = require('./config.json');
const data_file = fs.readFileSync('./data.json', 'utf-8');
var data = JSON.parse(data_file);
var errors = 0
var images_count = 0

function updateData() {
    data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'))
}
function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min))
}
async function sleep(time) {
    return new Promise(resolve => setTimeout(() => resolve(), time));
}

function dataCheck(){
    if (data[0]) {
        console.log(colors.bold("[OK]").green + " - Данные загружены.")
        data.forEach((str) => {
            if (str.banned) {
                console.log(colors.bold(str.token).green + " - " + colors.bold("заблокирован").red + ".")
            } else {
                console.log(colors.bold(str.token).green + " - " + colors.bold("не заблокирован").green + ".")
            }
        })
        var i = 0
        var needUpdate = false
        data.forEach((str) => {
            console.log(str.token + " | " + config.tokens[i])
            if (str.token === config.tokens[i]) {
    
            } else {
                needUpdate = true
            }
            i += 1
        })
    
        if (needUpdate === true || !data.length === config.tokens.length) {
            console.log(colors.bold("[~]").yellow + " - Данные нуждаются в обновлении, подождите...")
            fs.writeFileSync('./data.json', '[\n   \n]')
    
            data = []
    
            config.tokens.forEach((str) => {
                data.push({ token: str, banned: false })
            })
    
            fs.writeFileSync('./data.json', JSON.stringify(data))
            console.log(colors.bold("[OK]").green + " - Данные успешно обновлены!")
            updateData()
            start()
        } else {
            start()
        }
    
    } else {
        console.log(colors.bold("[~]").yellow + " - Запись новых данных...")
        fs.writeFileSync('./data.json', "[\n    \n]")
        console.log(data)
        config.tokens.forEach((str) => {
            data.push({ token: str, banned: false })
        })
        fs.writeFileSync('./data.json', JSON.stringify(data))
        updateData()
        start()
    }
}
dataCheck()
var stdin = process.stdin;
stdin.setRawMode( true );
stdin.resume();
stdin.setEncoding( 'utf8' );
stdin.on( 'data', function( key ){
  if ( key === '\u0003' ) {
    process.exit();
  }
  if(key === '`' || key === 'ё'){
      data.find(str => str.banned === false).banned = true
      fs.writeFileSync(__dirname+'/data.json', JSON.stringify(data))
      var new_account = data.find(str => str.banned === false)
      if(!new_account) {
        console.log(colors.bold("Больше аккаунтов не осталось.").red)
        process.exit()
      }
      console.log(colors.bold("[~]".yellow + " - Меняем аккаунт на " + `${new_account.token}`.green + "."))
      client.destroy()
      dataCheck()
  }
});

client.on('message', (msg) => {
    if(msg.channel.type === 'dm'){
        if(msg.author.id === client.user.id) return
        msg.channel.send(config.DMmessage)
    }
})

function start() {
    var channels = []
    var error = false
    var current = data.find(str => str.banned === false)
    if (!current) {
        console.log(colors.bold("[ERROR] - Все аккаунты заблокированы!").red)
        process.exit(1)
    }

    client.login(current.token).catch((err) => {
        error = true
        console.log(colors.bold("Не удалось подключиться к аккаунту! Ему присвоен статус забаненного.").red)
        data.find(str => str.banned === false).banned = true
        fs.writeFileSync('./data.json', JSON.stringify(data))
        start()
    })

    client.on('ready', () => {
        console.log(colors.bold("[OK]").green + " - Подключились к клиенту: " + colors.bold(client.user.tag).green + ".")
        var guild = client.guilds.find(g => g.id === config.targetGuild)

        if (!guild) {
            data.find(str => str.token === current.token).banned = true
            console.log(colors.bold("[ERROR]").red + " - Не удалось найти сервер. Скорей всего, пользователь заблокирован, аккаунту присвоен статус забаненного, перезапустите скрипт.")
            fs.writeFileSync('./data.json', JSON.stringify(data))
            return process.exit(1)
        }
        client.channels.forEach((channel) => {
            if (config.targetCategories.find(str => str === channel.parentID)) {
                if(channel.name.search('бизнес') != -1) return
                if(channel.name.search('реклама') != -1) return
                channels.push(channel.id)
            }

        })

        console.log(colors.bold("[INFO]").blue + " - Найдено " + colors.bold(channels.length).green + " каналов в нужных категориях.")

        var info = { sended: 0, cansend: true }

        var msgInterval = setInterval(() => {
            if (info.sended >= config.messages && info.cansend === true) {
                console.log(colors.bold("[OK]").green + " - Ждем " + colors.bold(config.sleep).green + " мс.")
                info.cansend = false
                setTimeout(() => {
                    info.sended = 0
                    info.cansend = true
                    console.log(colors.bold("[OK]").green + " - Снова можем отправлять сообщения!")
                }, config.sleep)
            }

            if (info.cansend === false) return

            send_message(msgInterval, current)
            info.sended += 1

        }, config.interval_per_message)



        function send_message(msgInterval, current) {

            var rand_channel = channels[getRandom(0, channels.length)]
            var channel = client.channels.find(ch => ch.id === rand_channel)
            if (!channel) {
                if(errors >= 5){
                    data.find(str => str.token === current.token).banned = true
                    fs.writeFileSync('./data.json', JSON.stringify(data))
                    console.log(colors.bold("[ERROR]").red + " - Канал не найден. Скорей всего аккаунт забанен. Аккаунту присвоен статус забаненного! Перезапустите скрипт")
                    process.exit()
                }
                console.log(colors.bold("[ERROR]").red + " - Канал не найден. Скорей всего аккаунт забанен. До присвоения статуса забанненого: "+errors+'/5')
                return errors += 1
            }
            if(!data.find(str => str.token === current.token)){
                console.log(colors.bold("Аккаунты закончились.".red))
                return process.exit(0)
            }
            if(!data.find(str => str.token === current.token).token === current.token){
                return clearInterval(msgInterval)
            }
            var random = getRandom(0, config.max_images)
            


            var path = "images/image"+random+".png"
            var name = "image"+random+'.png'
            
            var attachment = new Discord.Attachment(path, name)

            channel.send(config.messageContent, attachment).then((message) => {
                console.log(colors.bold('[OK]').red + ' - Сообщение отправлено в канал ' + colors.bold(channel.name).green + ". Картинка: " + colors.bold(message.attachments.first().filename).green + ".")
                
            }).catch((err) => {
                if (!client.guilds.find(g => g.id === config.targetGuild)) {
                    process.title = "ВНИМАНИЕ! Клиент заблокирован, требуется перезапуск программы."
                    console.log(colors.bold('[ERROR] - Клиент заблокирован! Требуется перезапуск программы.').red)
                    data.find(str => str.token === current.token).banned = true
                    fs.writeFileSync('./data.json', JSON.stringify(data))
                    return process.exit(1)
                }
                
                // console.log(colors.bold("[~]").yellow + " - Не можем отправить сообщение, пробуем ещё раз.")
                send_message(msgInterval, current)

            })
        }

    })

}



/*
"608612291105128459",
"652634648152899604",
"668167286217244733",
"675341098356310036",
"680543415674732566",
"688097544034713624",
"698164755919142953",
"702546494707728384",
"713466136137695376",
"713971362368323615",
"899338749316591636"
*/