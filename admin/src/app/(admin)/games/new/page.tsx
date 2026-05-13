'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameTemplateGallery } from '../studio/components/game-template-gallery';
import { GameCreationWizard } from '../studio/components/game-creation-wizard';

function NewGameContent() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset');

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Yeni Oyun Oluştur</h1>
          <p className="muted">Game Studio ile kolay oyun tasarlama aracı</p>
        </div>
      </div>

      {presetId ? (
        <GameCreationWizard presetId={presetId} />
      ) : (
        <GameTemplateGallery />
      )}
    </div>
  );
}

export default function NewGamePage() {
  return (
    <Suspense fallback={<div className="loading-spinner" />}>
      <NewGameContent />
    </Suspense>
  );
}
