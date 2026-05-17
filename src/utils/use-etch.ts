import { useQueryFirst } from 'koota/react';
import { IsEtchSketch, IsStylus } from '../core/traits';

export function useEtch() {
  return useQueryFirst(IsEtchSketch);
}

export function useStylus() {
  return useQueryFirst(IsStylus);
}
