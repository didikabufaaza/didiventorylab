import { buildApp } from '../server.js';

let appInstance: any = null;

export default async function handler(req: any, res: any) {
  // v2 - relational accounts
  if (!appInstance) {
    appInstance = await buildApp();
  }
  return appInstance(req, res);
}
