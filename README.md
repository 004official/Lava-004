<a href="https://discord.gg/wMQQWAH" target="_blank" rel="nofollow">![Untitled (2)](https://user-images.githubusercontent.com/57593203/119634078-90b49100-be3c-11eb-810b-b36356b52cdd.png)
</a>
<hr>
<a href="https://discord.gg/wMQQWAH" target="_blank" rel="nofollow">
 <img src="https://discordapp.com/api/guilds/763754086297632778/widget.png?style=banner3" alt="Discord Banner"/>
</a>
<hr>

# Installation
**วิธีการติดตั้งโมดูล LavaOne (NPM)**

```shell script
npm install lavaone -s
```

# How to use the module
**วิธีใช้การโมดูล LavaOne**

```js 
const lavaone = require("lavaone");
const discord = require("discord.js");

let client = new discord.Client();

let nodes = [
    {
      host: "127.0.0.1",
      port: 2333,
      password: "iqcodeiq",
    }
]

client.on("ready", async () => {
  client.music = new lavaone.LavaClient(client, nodes);
  
  client.music.Spotify = new lavaone.Spotify(
      "Spotify Client ID",
      "Spotify Client Scret"
   );

  client.music.on("nodeSuccess", (node) => {
    console.log(`Node connected: ${node.options.host}`);
  });

  client.music.on("nodeError", console.error);
});

client.login("Token");
```

**วิธีใช้การค้นหาเพลงจาก youtube**

```js
client.on("message", async (message) => {
  let prefix = "!";
  var slice = message.content.startsWith(prefix) ? prefix.length : 0;
  const args = message.content.slice(slice).split(/\s+/);

  if (message.content == prefix + "play") {
    let voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send("คุณไม่ได้อยู่ในห้องคุย");

    let player = await client.music.spawnPlayer(
      {
        guild: message.guild,
        voiceChannel, // ห้องเสียงที่ต้องการเล่นเพลง
        textChannel: message.channel, // ห้องข้อความ
        volume: 100, // ระดับเสียงเพลง
        deafen: true, // ปิดหูฟัง
      },
      {
        skipOnError: true,
      }
    );
    var res;
    try {
      res = await player.lavaSearch(args.slice(0).join(" "), message.member, {
        source: "yt",
        add: false,
      });
    } catch (e) {
      if (e) return await message.channel.send("Error ไม่สามารถหาเพลงได้");
    }

    player.queue.add(res[0]);
    if (!player.playing) await player.play();
  }
});
```
