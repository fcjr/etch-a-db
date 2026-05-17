import { useActions } from 'koota/react';
import { useEffect } from 'react';
import { actions } from './core/actions/actions';

export function Startup() {
  const { spawnEtchSketch } = useActions(actions);

  useEffect(() => {
    spawnEtchSketch();
  }, [spawnEtchSketch]);

  return null;
}
