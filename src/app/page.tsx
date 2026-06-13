'use client';

import { useRouter } from 'next/navigation';
import { ChampArt } from '@/components/champs/ChampArt';
import { resumeAudio } from '@/audio/sfx';

export default function Home() {
  const router = useRouter();

  // One tap from here to the board (PLAY -> board -> first move).
  const play = () => {
    resumeAudio(); // unlock audio on the first user gesture
    router.push('/play');
  };

  return (
    <div className="home">
      <div className="logo">
        CHESS
        <br />
        <span className="pop">CHAMPS</span>
      </div>

      <div className="home-champs">
        <ChampArt champId="bulwark" size={86} />
        <ChampArt champId="forkfang" size={108} />
        <ChampArt champId="finisher" size={86} />
      </div>

      <div className="tagline">Collect Champs. Climb the ranks. Become a chess legend!</div>

      <button className="btn btn-primary btn-big" style={{ maxWidth: 320 }} onClick={play}>
        ▶ PLAY
      </button>
    </div>
  );
}
