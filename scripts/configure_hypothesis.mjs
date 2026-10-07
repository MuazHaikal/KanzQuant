// Generates local credentials without exposing them in commands, output or git.
import {readFileSync,writeFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
const path=".env.local",original=readFileSync(path,"utf8");
let updated=original;
for(const [key,value] of Object.entries({HYPOTHESIS_RUN_SECRET:randomBytes(48).toString("base64url"),HYPOTHESIS_API_URL:"http://127.0.0.1:8001",HYPOTHESIS_EXECUTION_MODE:"local"})){
 if(!new RegExp(`^${key}=.+$`,"m").test(updated)){
  updated=updated.replace(new RegExp(`^${key}=.*\\r?\\n?`,"m"),"");updated+=`\n${key}=${value}\n`;
 }
}
if(updated!==original)writeFileSync(path,updated,{mode:0o600});
console.log("Local hypothesis configuration ready; existing settings preserved; secret not displayed.");
