import { GamesConsole } from './games-console';

export default function GamesPage() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="badge">Demo Game Catalog</span>
        <h1>AlbaGo icin 3 demo oyunu backend ile gercek zamanli yonetin.</h1>
        <p>
          Bu yuzey Sprint 4 icin Meyve Kesme, Engelden Kacis ve Spor Mucadelesi
          CRUD, validation, publish ve rollback akislarini gercek API uzerinden calistirir.
        </p>
      </section>

      <GamesConsole />
    </main>
  );
}
