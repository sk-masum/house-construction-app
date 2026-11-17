const fs = require("fs");

// Make sure the environments directory exists
const targetDir = "./src/environments";
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write Vercel's secure variables into the Angular environment file
const envConfigFile = `
export const environment = {
  production: true,
  tursoUrl: '${process.env.TURSO_DATABASE_URL}',
  tursoToken: '${process.env.TURSO_AUTH_TOKEN}'
};
`;

fs.writeFile(`${targetDir}/environment.ts`, envConfigFile, function (err) {
  if (err) {
    console.error("Error writing environment file:", err);
    process.exit(1);
  } else {
    console.log(
      "Successfully generated environment.ts for Vercel production build",
    );
  }
});
