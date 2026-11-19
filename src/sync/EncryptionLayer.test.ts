import { describe, expect, it } from 'vitest';
import { EncryptionLayer, checksum } from './EncryptionLayer';
describe('ported sync encryption',()=>{
 it('encrypts large chat payloads without overflowing argument limits',async()=>{const layer=new EncryptionLayer();layer.setPassphrase('large');const text='A'.repeat(500000);expect(await layer.decrypt(await layer.encrypt(text))).toBe(text)});
 it('decrypts on another device with payload salt and rejects wrong passphrases',async()=>{
  const sender=new EncryptionLayer();sender.setPassphrase('correct horse');const payload=await sender.encrypt('Private chat: 你好');
  expect(payload.ciphertext).not.toContain('Private');
  const receiver=new EncryptionLayer();receiver.setPassphrase('correct horse');expect(await receiver.decrypt(payload)).toBe('Private chat: 你好');
  const wrong=new EncryptionLayer();wrong.setPassphrase('wrong');await expect(wrong.decrypt(payload)).rejects.toThrow();
 });
 it('detects authenticated ciphertext tampering',async()=>{const crypto=new EncryptionLayer();crypto.setPassphrase('test');const payload=await crypto.encrypt('private');payload.ciphertext=btoa('tampered');await expect(crypto.decrypt(payload)).rejects.toThrow()});
 it('retains explicit plaintext mode and stable checksums',async()=>{const layer=new EncryptionLayer();const payload=await layer.encrypt('plain');expect(payload.unencrypted).toBe(true);expect(await layer.decrypt(payload)).toBe('plain');expect(await checksum('plain')).toHaveLength(64)});
});
