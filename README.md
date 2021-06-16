<a href="https://discord.gg/004" target="_blank" rel="nofollow">![Untitled (2)](https://cdn.discordapp.com/attachments/811573370104709152/854832063059460096/New_Project_1.png)
</a>
<hr>
<a href="https://discord.gg/004" target="_blank" rel="nofollow">
 <img src="https://discordapp.com/api/guilds/804391686054215751/widget.png?style=banner2" alt="Discord Banner"/>
</a>
<hr>

# Installation
**วิธีการติดตั้งโมดูล Lava-004 (NPM)**

```shell script
npm install lava-004 -s
```

# How to use the module
> Documentation: <https://docs.lavaone.no-one.xyz/> 
<hr>

**วิธีใช้การโมดูล Lava-004**

```js 
const lava-004 = require("lava-004");
const discord = require("discord.js");

let client = new discord.Client();

let nodes = [
    {
      host: "127.0.0.1",
      port: 2333,
      password: "004@iq200",
    }
]

client.on("ready", async () => {
  client.music = new lava-004.LavaClient(client, nodes);
  
  client.music.Spotify = new lava-004.Spotify(
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
  console.log(message.content);
  let prefix = "!";
  var slice = message.content.startsWith(prefix) ? prefix.length : 0;
  const args = message.content.slice(slice).split(/\s+/);
  var command = args.shift().toLowerCase();
  if (command == "play") {
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
  if (command == "skip") {
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
    await player.play();
  }
});
```
