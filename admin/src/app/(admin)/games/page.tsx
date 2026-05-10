import { AdminTopbar } from '../../components/admin-topbar';
import { GamesConsole } from './games-console';

export default function GamesPage() {
  return (
    <>
      <AdminTopbar
        title="Oyun Yonetimi"
        subtitle="CRUD, validation, publish ve rollback akislarini gercek API uzerinden calistirir."
      />
      <GamesConsole />
    </>
  );
}
