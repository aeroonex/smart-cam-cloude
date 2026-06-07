const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

const CONFIG = {
  host: "103.195.6.110",
  port: 22,
  username: "root",
  password: "Abdulmalik2005\n".trim(),
};

const LOCAL_DIST = path.join(__dirname, "dist");
const REMOTE_APP = "/var/www/smart-cam";
const TMP_ZIP = path.join(os.tmpdir(), "smart-cam-dist.zip");
const REMOTE_ZIP = "/tmp/smart-cam-dist.zip";

// 1. Zip the dist folder
console.log("📦 Zipping dist...");
if (fs.existsSync(TMP_ZIP)) fs.unlinkSync(TMP_ZIP);
execSync(`powershell Compress-Archive -Path "${LOCAL_DIST}\\*" -DestinationPath "${TMP_ZIP}" -Force`);
console.log(`✅ Zipped: ${TMP_ZIP} (${(fs.statSync(TMP_ZIP).size / 1024).toFixed(0)} KB)`);

const conn = new Client();
conn.on("ready", () => {
  console.log("🔗 SSH connected");

  // 2. Upload zip
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log("⬆️  Uploading zip...");
    sftp.fastPut(TMP_ZIP, REMOTE_ZIP, {}, (err) => {
      if (err) throw err;
      console.log("✅ Uploaded");

      // 3. Extract + restart
      const cmd = [
        `rm -rf ${REMOTE_APP}/dist`,
        `mkdir -p ${REMOTE_APP}/dist`,
        `unzip -o ${REMOTE_ZIP} -d ${REMOTE_APP}/dist`,
        `rm ${REMOTE_ZIP}`,
        `cd ${REMOTE_APP} && pm2 restart all --update-env 2>/dev/null || pm2 start ecosystem.config.js 2>/dev/null || echo "PM2 restart attempted"`,
        `sleep 1 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || curl -s -o /dev/null -w "%{http_code}" http://localhost:80 || echo "Server check done"`,
      ].join(" && ");

      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on("data", (d) => process.stdout.write(d.toString()));
        stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
        stream.on("close", (code) => {
          console.log(`\n🎉 Deploy complete! Exit: ${code}`);
          conn.end();
        });
      });
    });
  });
}).connect(CONFIG);

conn.on("error", (err) => {
  console.error("SSH Error:", err.message);
  process.exit(1);
});
