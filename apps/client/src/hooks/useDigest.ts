import { useContext } from 'react';
import { DigestContext } from '../contexts/digest-context';

export function useDigest() {
  const ctx = useContext(DigestContext);
  if (!ctx) throw new Error('useDigest must be used within a DigestProvider');
  return ctx;
}
