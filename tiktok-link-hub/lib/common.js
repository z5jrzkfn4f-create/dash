import { Redis } from "@upstash/redis";
import { createHmac, timingSafeEqual } from "node:crypto";
export const redis = new Redis({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN});
export const LINKS_KEY="tiktok-hub:links", POINTER_KEY="tiktok-hub:pointer", COUNTER_PREFIX="tiktok-hub:count:";
export function json(statusCode,body,headers={}){return {statusCode,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers},body:JSON.stringify(body)}}
function sign(s){return createHmac("sha256",process.env.SESSION_SECRET||"").update(s).digest("base64url")}
export function makeSession(){const p=Buffer.from(JSON.stringify({exp:Date.now()+28800000})).toString("base64url");return p+"."+sign(p)}
export function validSession(e){const c=e.headers?.cookie||e.headers?.Cookie||"";const raw=c.split(";").map(x=>x.trim()).find(x=>x.startsWith("tlh_session="))?.slice(12);if(!raw||!process.env.SESSION_SECRET)return false;const a=raw.split(".");if(a.length!==2)return false;const x=Buffer.from(sign(a[0])),y=Buffer.from(a[1]);if(x.length!==y.length||!timingSafeEqual(x,y))return false;try{return JSON.parse(Buffer.from(a[0],"base64url").toString()).exp>Date.now()}catch{return false}}
export function cookieHeader(v,age=28800){return `tlh_session=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`}
export function validTikTokUrl(s){try{const u=new URL(s);return u.protocol==="https:"&&(u.hostname==="tiktok.com"||u.hostname.endsWith(".tiktok.com"))}catch{return false}}
