# AlbaGo P21 — Profil Navbar, Oyun Sonuç Akışı ve Supabase Dinamik Katalog Uygulama Planı

**Kapsam:** Android Jetpack Compose uygulaması, NestJS/Prisma backend, Next.js admin paneli  
**Kaynak:** Kullanıcının yüklediği `ar-kose-albago2` proje dökümü ve ekran görüntüleri  
**Öncelik:** Üretim güvenliği → veri doğruluğu → tasarım tutarlılığı → hızlı teslim

---

## 0. Net karar

Bu projede doğru çözüm **Android uygulamasını doğrudan Supabase’e bağlamak değil**, mevcut mimariye uygun olarak şu akışı sağlamaktır:

```txt
Admin Paneli / Backend
        ↓
NestJS API
        ↓
Prisma
        ↓
Supabase PostgreSQL
        ↑
Android sadece NestJS API ile konuşur
```

Bunun nedeni: Projede zaten “Android → NestJS → Supabase PostgreSQL” katmanı kurulmuş. Android tarafında Supabase anon key bulunuyor ama mimari doğrulama dosyalarında bunun kullanılmayan/dead-code olduğu ve tüm yazmaların NestJS üzerinden geçtiği belirtilmiş. Bu karar korunmalı; aksi halde RLS, servis rolü, offline queue ve idempotency akışı kırılabilir.

**Sonuç:** “Supabase ile dinamik senkron” talebi şu şekilde uygulanacak:

1. Supabase PostgreSQL backend’in kalıcı veri kaynağı olacak.
2. Android oyun/kategori kataloğunu `GET /v1/game-definitions/active` üzerinden canlı alacak.
3. Oyun sonucu Android Room’a local-first kaydedilecek, sonra WorkManager/NestJS ile Supabase’e senkronlanacak.
4. Mock/fallback kataloglar prod ve beta akışından kaldırılacak.

---

## 1. Mevcut durumdan çıkarılan ana problemler

### 1.1 Profil sayfasında navbar görünmüyor

`ProfileScreen.kt` standalone bir ekran gibi tasarlanmış:

- `onNavigateBack` parametresi var.
- Header’da `Geri` butonu var.
- Sayfanın altında ayrıca `Ana ekrana don` butonu var.
- `contentPadding` almıyor; bu da top-level tab shell içinde render edilmediğini gösteriyor.

Bu yüzden profil, bottom navbar’ın parçası değilmiş gibi davranıyor.

**Kök sebep:** Profil ekranı top-level destination yerine ayrı/geri dönülebilir screen gibi ele alınmış.

### 1.2 Oyun bitince sonuç ekranı neon tasarımla tutarsız

`GamesFeature.kt` içinde sonuç akışı mevcut ama tam shell davranışı doğru değil:

- `GameFlowStage` hâlâ `CATALOG`, `DETAIL`, `SESSION` olarak çalışıyor.
- Aktif oyun ekranında `Katalog`, `Yenile`, `Ana ekran` gibi butonlar var.
- Oyun `FINISHED` olduğunda `ResultSheet` gösteriliyor ama aynı ekranda eski `HeroCard`, `GameHudCard`, eski kart düzeni de kalabiliyor.
- `HeroCard` açık renkli `Color(0xFFF7F1E8)` kullanıyor; ekran görüntüsündeki neon/dark sistemle çakışıyor.
- “Katalog” ifadesi ve davranışı kullanıcıyı eski oyun kartları sayfasına döndürüyor.

**Kök sebep:** Yeni neon tasarım ile eski catalog/detail/session state machine aynı dosyada karışmış.

### 1.3 Kategoriler ve oyunlar dinamik Supabase verisi gibi davranmıyor

Projede birden fazla mock/fallback kaynağı var:

- `admin/src/app/page.tsx` içinde `fallbackGames` var.
- `admin/src/lib/mock-data.ts` statik dashboard/game/publish/audit dataları içeriyor.
- `backend/src/common/contracts.ts` içinde `seededGames` var.
- `backend/src/common/in-memory-store.ts` bu seed datayı belleğe alıyor.
- `backend/src/persistence/game-definitions.repository.ts` DB boşsa `ensureSeeded()` ile seed oyunları otomatik basıyor.
- Android `GamesFeature.kt` kullanıcıya “Yerel demo” mesajı gösterebiliyor.
- Android `MotionUiState.kt` default game title olarak `Demo Game` taşıyor.

**Kök sebep:** Mock data sadece test fixture değil; bazı yerlerde runtime fallback gibi davranıyor.

---

## 2. Hedef mimari

### 2.1 Navigasyon hedefi

```txt
AppShell / Scaffold
 ├─ BottomNav: Ana Sayfa
 ├─ BottomNav: Spor
 ├─ BottomNav: Profil
 ├─ BottomNav: Eğitim
 └─ BottomNav: Eğlence

Profil = top-level destination
Profil içinde Geri butonu yok
Profil bottom navbar padding’i ile render edilir
```

### 2.2 Oyun akışı hedefi

```txt
Oyunlar tab/listesi
 ├─ Oyun detay/hazırlık
 ├─ Aktif oyun
 └─ Neon sonuç ekranı
      ├─ Tekrar oyna
      ├─ Oyunlara dön
      └─ Ana sayfa
```

Artık kullanıcıya “Katalog” diye ayrı/eski bir rota gösterilmeyecek.

### 2.3 Veri hedefi

```txt
Admin publish
 ↓
Backend validation
 ↓
Supabase PostgreSQL / Prisma
 ↓
GET /v1/game-definitions/active
 ↓
Android runtime catalog
 ↓
GameRuntime
 ↓
Room local result
 ↓
POST /v1/game-sessions
 ↓
Supabase PostgreSQL
```

---

## 3. Uygulama planı

## Faz 0 — Güvenli keşif ve branch hazırlığı

### Amaç

Gerçek repo içinde shell/navigasyon dosyasını bulmak, eksik export yüzünden riskli tahminle ilerlememek.

### Komutlar

```bash
git checkout -b p21-neon-nav-supabase-catalog

grep -R "GamesHomeScreen" -n android/app android/feature_games
grep -R "ProfileScreen" -n android/app android/feature_games
grep -R "Scaffold" -n android/app/src/main android/feature_* android/core_*
grep -R "Bottom" -n android/app/src/main android/feature_* | head -80
grep -R "Katalog\|Catalog\|Diğer oyunlar\|Demo vitrini\|Yerel demo" -n android admin backend
```

### Beklenen bulgular

- `GamesHomeScreen` zaten `android/feature_games/.../GamesFeature.kt` içinde.
- `ProfileScreen` `android/app/src/main/java/com/alba/app/ui/showcase/ProfileScreen.kt` içinde.
- Asıl `MainActivity.kt` veya app shell dosyası yüklenen export içinde görünmüyor; gerçek repoda bulunmalı.

### Başarı ölçütü

- Bottom navigation’ı yöneten tek dosya tespit edildi.
- Profilin hangi route/state ile açıldığı bulundu.
- Eski katalog route/string/import listesi çıkarıldı.

---

## Faz 1 — Profil ekranını top-level tab haline getirme

### Hedef

Profil sayfası da Ana Sayfa/Spor/Eğitim/Eğlence gibi bottom navbar altında görünsün. `Geri` ve `Ana ekrana dön` butonları kaldırılmış veya top-level shell ile uyumlu hale getirilmiş olsun.

### Değiştirilecek dosyalar

```txt
android/app/src/main/java/com/alba/app/ui/showcase/ProfileScreen.kt
android/app/src/main/java/com/alba/app/MainActivity.kt               # gerçek repoda bulunacak
veya app shell / root compose dosyası
```

### 1.1 ProfileScreen imzası

Mevcut yapı:

```kotlin
fun ProfileScreen(
    uiState: MotionUiState,
    repository: GameSessionRepository?,
    onNavigateBack: () -> Unit,
    onNavigateHome: () -> Unit
)
```

Hedef yapı:

```kotlin
fun ProfileScreen(
    contentPadding: PaddingValues,
    uiState: MotionUiState,
    repository: GameSessionRepository?
)
```

Alternatif olarak `onNavigateHome` sadece debug/dev için kalabilir; ama production profil ekranında görünür bir ana sayfa butonu olmamalı çünkü navbar zaten var.

### 1.2 Layout padding düzeltmesi

Mevcut ekran `statusBarsPadding()` ve `padding(16.dp)` kullanıyor. Top-level shell içinde bu, navbar ve statusbar ile çakışabilir.

Hedef:

```kotlin
Column(
    modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFF05060E))
        .padding(contentPadding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.spacedBy(16.dp)
) {
    // Profil içeriği
}
```

### 1.3 Header düzeltmesi

Mevcut:

```kotlin
OutlinedButton(onClick = onNavigateBack) {
    Text("Geri")
}
```

Kaldırılacak.

Hedef header:

```kotlin
Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text("Profil", style = MaterialTheme.typography.headlineSmall, color = Color.White)
        Text("Cihaz profili", color = Color.White.copy(alpha = 0.60f))
    }
}
```

### 1.4 App shell route düzeltmesi

Gerçek shell dosyasında profil şu şekilde açılmalı:

```kotlin
when (selectedDestination) {
    AppDestination.Home -> HomeScreen(contentPadding = innerPadding, ...)
    AppDestination.Sport -> SportScreen(contentPadding = innerPadding, ...)
    AppDestination.Profile -> ProfileScreen(
        contentPadding = innerPadding,
        uiState = uiState,
        repository = gameSessionRepository
    )
    AppDestination.Education -> EducationScreen(contentPadding = innerPadding, ...)
    AppDestination.Entertainment -> GamesHomeScreen(contentPadding = innerPadding, ...)
}
```

Profil **ayrı navigation stack push** olarak değil, bottom nav destination olarak seçilmeli.

### Test

```bash
./gradlew.bat :app:compileDebugKotlin --no-daemon
./gradlew.bat :app:assembleDebug --no-daemon
```

Manuel kontrol:

```txt
[ ] Profil tabına basınca bottom navbar görünür.
[ ] Profil ekranında Geri butonu görünmez.
[ ] Profil ekranında Ana ekrana dön butonu görünmez.
[ ] Android sistem geri tuşu profil tabındayken önce önceki top-level tab davranışına veya app çıkış standardına uygun çalışır.
[ ] Profil scroll edince navbar üstüne içerik binmez.
```

---

## Faz 2 — Oyun bitiş ekranını neon sonuç ekranına ayırma

### Hedef

Oyun `FINISHED` olduğunda kullanıcı eski katalog/detay kartlarıyla karışık bir ekrana değil, tam neon sonuç ekranına düşmeli.

### Değiştirilecek dosya

```txt
android/feature_games/src/main/java/com/alba/feature/games/GamesFeature.kt
```

### 2.1 State isimlerini ürün diline çekme

Mevcut:

```kotlin
private enum class GameFlowStage {
    CATALOG,
    DETAIL,
    SESSION
}
```

Hedef:

```kotlin
private enum class GameFlowStage {
    LIST,
    DETAIL,
    SESSION
}
```

Bu sadece isim değişikliği değil; kullanıcıya görünen “Katalog” kavramını da bitirecek.

Değiştirilecek stringler:

```txt
Demo vitrini       -> Oyun vitrini
Katalog            -> Oyunlara dön
Kataloğa dön       -> Oyunlara dön
Diğer oyunlar      -> Oyunlara dön
Yerel demo         -> Çevrimdışı / veri yüklenemedi
Demo Game          -> Oyun
```

### 2.2 ActiveGameScreen içinde FINISHED erken dönüşü

Mevcut davranışta önce hero/hud/aksiyon kartı çiziliyor, sonra `ResultSheet` ekleniyor. Bu sonuç ekranını “eski sayfanın içine iliştirilmiş” gibi gösteriyor.

Hedef davranış:

```kotlin
@Composable
private fun ActiveGameScreen(...) {
    if (uiState.game.status == GameSessionStatus.FINISHED) {
        GameResultScreen(
            game = uiState.game,
            template = gameDefinition.template,
            gameTitle = gameDefinition.title,
            onReplay = onReplay,
            onBackToGames = onBrowseGames,
            onHome = onNavigateBack
        )
        return
    }

    // sadece aktif/paused oyun içeriği burada
}
```

### 2.3 Katalog butonunu kaldırma

Mevcut:

```kotlin
OutlinedButton(onClick = onBrowseGames) {
    Text("Katalog")
}
```

Hedef:

```kotlin
OutlinedButton(onClick = onBrowseGames) {
    Text("Oyunlara dön")
}
```

Aktif oyun devam ederken tercihen sadece iki ana aksiyon olmalı:

```txt
[Oyunu bitir] [Ana ekran]
```

Sonuç ekranında:

```txt
[Tekrar oyna] [Oyunlara dön] [Ana sayfa]
```

### 2.4 Neon sonuç ekranı bileşeni

Yeni bileşen önerisi:

```kotlin
@Composable
private fun GameResultScreen(
    game: GameUiState,
    template: GameTemplate,
    gameTitle: String,
    onReplay: () -> Unit,
    onBackToGames: () -> Unit,
    onHome: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        NeonPanel {
            Text("Oyun tamamlandı", color = Color(0xFFFF1593), ...)
            Text(gameTitle, color = Color.White, ...)
            // skor, combo, accuracy, süre, sync durumu
        }
        Row(...) {
            Button(onClick = onReplay, ... ) { Text("Tekrar oyna") }
            OutlinedButton(onClick = onBackToGames) { Text("Oyunlara dön") }
            OutlinedButton(onClick = onHome) { Text("Ana sayfa") }
        }
    }
}
```

Neon tasarım tokenları:

```kotlin
private val AlbaBg = Color(0xFF05060E)
private val AlbaPanel = Color(0xFF101522)
private val AlbaPanelAlt = Color(0xFF1A0E1F)
private val AlbaHot = Color(0xFFFF1593)
private val AlbaCyan = Color(0xFF11D7F4)
private val AlbaPurple = Color(0xFF9B4DFF)
private val AlbaOrange = Color(0xFFFF7A45)
private val AlbaSuccess = Color(0xFF20E99A)
```

### 2.5 Açık renkli kartları kapatma

Şu bileşenler neon/dark temaya çekilmeli:

```txt
HeroCard
EmptyCatalogCard
CatalogStateCard
InvalidGameDefinitionCard
ProgramStepList
FitChallengeScene içindeki iç Card
ScenePlayScene boş state Box
FruitSlashScene boş hedef Box
```

Özellikle `HeroCard` şu anda açık krem zemin kullanıyor:

```kotlin
Card(
    colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F1E8))
)
```

Hedef:

```kotlin
Card(
    colors = CardDefaults.cardColors(containerColor = Color(0xFF101522)),
    border = BorderStroke(1.dp, accent.copy(alpha = 0.42f)),
    shape = RoundedCornerShape(24.dp)
)
```

### Test

```txt
[ ] Oyunu başlat -> oyun aktif ekranı neon kalır.
[ ] Oyunu bitir -> yalnızca sonuç ekranı görünür.
[ ] Sonuç ekranında eski açık renk kartlar görünmez.
[ ] “Katalog” kelimesi Android UI’da görünmez.
[ ] “Oyunlara dön” eski ayrı katalog route’una değil yeni Oyunlar listesine döner.
[ ] “Tekrar oyna” aynı gameId ile yeni session başlatır.
[ ] “Ana sayfa” bottom nav home destination’a döner.
```

Automated string check:

```bash
grep -R "Katalog\|Catalog\|Demo vitrini\|Diğer oyunlar" -n android/feature_games android/app/src/main
```

Beklenen: sadece migration notu/test snapshot yoksa sonuç boş.

---

## Faz 3 — Eski katalog sayfasını route olarak kapatma

### Hedef

Kullanıcı hiçbir butonla veya deep link/debug extra ile eski katalog sayfasına gitmesin.

### Yapılacaklar

1. Route/string taraması:

```bash
grep -R "CATALOG\|Catalog\|catalog\|Katalog" -n android backend admin docs openapi
```

2. Android runtime içinde eski route varsa:

```kotlin
// Kötü
StartDestination.CATALOG

// Hedef
StartDestination.GAMES
```

3. Debug extra destekleri:

README’de `albago.startDestination GAMES` kullanılıyor. Eğer gerçek shell içinde `CATALOG` debug alias’ı varsa kaldırılmalı veya `GAMES`’e redirect edilmeli.

4. Admin tarafında “Demo Game Catalog” başlığı kullanıcıya bakan mobil ürünle karışıyorsa admin içinde kalabilir; Android’de kalmamalı.

### Kabul kriteri

```txt
[ ] Android kaynak kodunda kullanıcıya gösterilen “Katalog” yok.
[ ] Debug deep link eski katalog açmıyor.
[ ] Oyun listesi sadece “Oyunlar” top-level yüzeyi olarak var.
[ ] Eski oyun kartları sayfası fiziksel cihazda erişilemiyor.
```

---

## Faz 4 — Mock data ve fallback envanterini temizleme

### Hedef

Prod/beta runtime’da oyunlar ve kategoriler mock/seed/fallback’tan değil Supabase PostgreSQL’den gelsin.

### 4.1 Admin mock temizliği

#### Dosya: `admin/src/app/page.tsx`

Mevcut problem:

```ts
const fallbackGames = [...]
const [games, setGames] = useState(fallbackGames)
...
.catch(() => {
  setGames(fallbackGames)
  setMessage('Yerel demo görünümü aktif.')
})
```

Hedef:

```ts
const [games, setGames] = useState<GameSummary[]>([])
const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

useEffect(() => {
  Promise.all([listGameDefinitions(), listAuditLogs()])
    .then(([gameList, auditLogs]) => {
      setGames(gameList)
      setAuditCount(auditLogs.length)
      setLoadState(gameList.length ? 'ready' : 'empty')
      setMessage(gameList.length ? 'Canlı oyun ve audit verileri yüklendi.' : 'Yayında oyun yok.')
    })
    .catch((error) => {
      setGames([])
      setLoadState('error')
      setMessage(`Backend okunamadı: ${error instanceof Error ? error.message : 'unknown_error'}`)
    })
}, [])
```

`fallbackGames` tamamen silinecek.

#### Dosya: `admin/src/lib/mock-data.ts`

Seçenekler:

- Eğer hiçbir import kalmadıysa dosya silinir.
- Test fixture lazımsa `admin/src/lib/__fixtures__/mock-data.ts` altına taşınır ve production import yasağı konur.

Kontrol:

```bash
grep -R "mock-data\|fallbackGames" -n admin/src
```

### 4.2 Backend seed/fallback temizliği

#### Dosyalar

```txt
backend/src/common/contracts.ts
backend/src/common/in-memory-store.ts
backend/src/persistence/game-definitions.repository.ts
backend/prisma/seed.ts
backend/.env.example
```

#### Problem

`GameDefinitionsRepository.ensureSeeded()` DB boşsa `seededGames` basıyor. Supabase boşken bu kullanıcıya “dinamik” gibi görünen ama gerçekte mock olan oyunlar döndürür.

#### Hedef davranış

- Development seed sadece açık komutla veya açık env ile çalışır.
- Beta/prod DB boşsa `/game-definitions/active` boş döner.
- Android boş katalog state gösterir, mock oyun açmaz.

#### Önerilen env

```env
AUTO_SEED_DEMO_GAMES=false
ALLOW_IN_MEMORY_FALLBACK=false
PERSISTENCE_MODE=prisma
DATABASE_URL=<Supabase PostgreSQL connection>
```

#### Repository değişikliği

Mevcut:

```ts
if (count === 0) {
  this.seeded = true;
  for (const game of seededGames) {
    await this.persist(game);
  }
  return;
}
```

Hedef:

```ts
if (count === 0 && process.env.AUTO_SEED_DEMO_GAMES === 'true') {
  this.seeded = true;
  for (const game of seededGames) {
    await this.persist(game);
  }
  return;
}
this.seeded = true;
```

Daha temiz hedef:

- `ensureSeeded()` tamamen kaldırılır.
- Seed sadece `npm run prisma:seed --workspace backend` ile yapılır.

**Benim önerim:** P21’de önce env-gated yap; P22’de `seededGames`’i test fixture’a taşı. Çünkü mevcut backend testleri `seededGames` kullanıyor; tek committe silmek testleri gereksiz kırabilir.

### 4.3 Android local demo fallback temizliği

#### Dosyalar

```txt
android/core_network/src/main/java/com/alba/core/network/SupabaseData.kt
android/core_data/src/main/java/com/alba/core/data/MotionUiState.kt
android/feature_games/src/main/java/com/alba/feature/games/GamesFeature.kt
app shell / MainActivity / state holder dosyası
```

#### Hedef

- `SupabaseData.getActiveGames()` zaten backend endpoint’ini çağırıyor.
- State holder, network hata aldığında `availableGames` içine local demo oyun koymamalı.
- Kullanıcıya hata/empty state göstermeli.

Backend status mesajları:

```txt
loading: "Oyunlar yükleniyor..."
ready: "Oyunlar güncel."
empty: "Yayında oyun yok."
error: "Oyunlar yüklenemedi. Bağlantını kontrol edip tekrar dene."
```

Kaldırılacak/yenilenecek ifadeler:

```txt
Yerel demo
Demo oyunlar yerel modda açıldı
Demo vitrini
Demo Game
```

### 4.4 Supabase bağlantı doğrulaması

Backend `.env.example` Supabase runtime ve migration bağlantılarını zaten açıklıyor. Uygulama adımları:

```bash
# backend/.env
PERSISTENCE_MODE="prisma"
ALLOW_IN_MEMORY_FALLBACK="false"
AUTO_SEED_DEMO_GAMES="false"
DATABASE_URL="postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres"
```

Migration:

```bash
npm.cmd run prisma:generate --workspace backend
npm.cmd run prisma:migrate:deploy --workspace backend
```

Lokal geliştirme için:

```bash
npm.cmd run prisma:seed --workspace backend
```

Beta/prod için seed otomatik çalıştırılmamalı.

---

## Faz 5 — Kategori ve oyun senkronizasyonunu gerçek dinamik hale getirme

### Hedef

Admin’den publish edilen kategori/oyun Android’de refresh sonrası görünmeli. Kategori filtreleri sabit mock değil, canlı oyunların kategorilerinden türemeli.

### Android kategori filtresi

Mevcut:

```kotlin
GameCategory.values().forEach { category -> ... }
```

Bu enum filtresi kategori sayısı sabit kalacaksa kabul edilebilir; ama “dinamik” hissi için boş kategoriler gösterilmemeli.

Hedef:

```kotlin
val availableCategories = games
    .map { it.category }
    .distinct()
    .sortedBy { it.displayRank() }
```

Sonra:

```kotlin
availableCategories.forEach { category ->
    CategoryChip(...)
}
```

### Backend active endpoint

`GET /v1/game-definitions/active` zaten şunları döndürüyor:

```txt
id, gameKey, version, template, title, description, status, minAppVersion,
category, tags, orientation, cameraRequirement, supportedMotions, levels, assets, publishedAt
```

Bu endpoint Android’in tek catalog kaynağı olmalı.

### Admin publish sonrası Android refresh

Akış:

```txt
Admin publish
 ↓
Backend status=PUBLISHED + publishedAt
 ↓
Android Oyunlar sayfasında Yenile
 ↓
SupabaseData.getActiveGames()
 ↓
availableGames güncellenir
```

Kabul kriteri:

```txt
[ ] Admin’den yeni SCENE_PLAY oyunu publish edilir.
[ ] Android yenile sonrası oyun görünür.
[ ] Admin’de kategori SPORT yapılırsa Android Spor filtresinde görünür.
[ ] Admin’de oyun ARCHIVED/DRAFT yapılırsa Android active listeden düşer.
[ ] Supabase DB boşsa Android mock oyun göstermez.
```

---

## Faz 6 — Oyun sonucu senkronizasyonu ve profil verisi

### Mevcut iyi taraf

`GameSessionRepository` local-first çalışıyor:

- Sonuç önce Room’a yazılıyor.
- Sync queue’ya ekleniyor.
- Profil `Flow` ile local Room’dan okuyor.

Bu doğru korunmalı.

### Eksik risk

Profildeki “Sunucuda/Senkron/Bekleyen” verisi local queue’dan geliyor. Bu iyi; ama kullanıcı “Supabase ile senkron” beklediği için şu açık gösterilmeli:

```txt
Senkron: ✓      -> backend kabul etti
Bekleyen: n     -> Room’da kayıt var, queue bekliyor
Sunucuda: n     -> syncStatus=SYNCED local kayıt sayısı
```

### Backend idempotency

`POST /v1/game-sessions` `clientSessionId` ile idempotent çalışıyor. Bu korunmalı.

Kabul kriteri:

```txt
[ ] Oyunu bitirince local Room’a kayıt düşer.
[ ] Backend açıksa session Supabase’e yazılır.
[ ] Aynı clientSessionId tekrar gönderilirse duplicate_accepted döner.
[ ] Profilde son oyunlar görünür.
[ ] İnternet yoksa sonuç kaybolmaz, Bekleyen artar.
[ ] İnternet gelince WorkManager sync eder, Sunucuda artar.
```

---

## 4. Commit planı

### Commit 1 — `fix(android-profile): render profile inside bottom nav shell`

İçerik:

- `ProfileScreen` top-level tab uyumlu hale getirilir.
- `Geri` ve `Ana ekrana don` kaldırılır.
- App shell profil route’u bottom nav destination’a bağlanır.

Test:

```bash
./gradlew.bat :app:compileDebugKotlin --no-daemon
./gradlew.bat :app:assembleDebug --no-daemon
```

### Commit 2 — `fix(android-games): replace legacy catalog wording and isolate result screen`

İçerik:

- `CATALOG` → `LIST` refactor.
- “Katalog” buton/string kaldırılır.
- `GameResultScreen` FINISHED durumunda full neon ekran olarak render edilir.
- Açık renkli kartlar neon dark tasarıma çekilir.

Test:

```bash
grep -R "Katalog\|Catalog\|Demo vitrini\|Diğer oyunlar" -n android/feature_games android/app/src/main
./gradlew.bat :feature_games:compileDebugKotlin --no-daemon
./gradlew.bat :app:assembleDebug --no-daemon
```

### Commit 3 — `fix(admin): remove runtime fallback games from dashboard`

İçerik:

- `fallbackGames` kaldırılır.
- Admin dashboard loading/empty/error state eklenir.
- `mock-data.ts` production import dışına alınır veya silinir.

Test:

```bash
npm.cmd run build --workspace admin
```

### Commit 4 — `fix(backend): gate demo seeding and fail closed on missing data`

İçerik:

- `AUTO_SEED_DEMO_GAMES` env eklenir.
- `ensureSeeded()` otomatik seed yapmaz, sadece env true ise çalışır.
- `.env.example` güncellenir.
- Test fixture kullanımı düzenlenir.

Test:

```bash
npm.cmd run prisma:generate --workspace backend
npm.cmd run build --workspace backend
npm.cmd run test --workspace backend
```

### Commit 5 — `fix(android-catalog): use backend active games as only runtime catalog source`

İçerik:

- Android state holder local demo fallback kullanmaz.
- Empty/error state gerçek boş veri gösterir.
- Kategoriler canlı oyun listesinden türetilir.

Test:

```bash
./gradlew.bat :core_network:compileDebugKotlin :core_data:compileDebugKotlin :feature_games:compileDebugKotlin --no-daemon
./gradlew.bat testDebugUnitTest --no-daemon
./gradlew.bat :app:assembleDebug --no-daemon
```

### Commit 6 — `test(e2e): add catalog/profile/result acceptance checks`

İçerik:

- Backend active list testi.
- Android string regression test veya UI snapshot check.
- Manual device acceptance checklist güncellemesi.

Test:

```bash
powershell -ExecutionPolicy Bypass -File scripts/verify-platform-v2.ps1
```

---

## 5. Kabul test matrisi

| Alan | Test | Beklenen |
|---|---|---|
| Profil navbar | Profil tabı açılır | Bottom navbar görünür |
| Profil header | Profil ekranında `Geri` aranır | Görünmez |
| Profil footer | `Ana ekrana don` aranır | Görünmez veya debug-only |
| Oyun sonucu | Oyun bitirilir | Tam neon sonuç ekranı açılır |
| Legacy katalog | Sonuçta `Katalog` aranır | Yok |
| Oyunlara dön | Sonuçtan oyunlara dönülür | Yeni neon oyun listesine döner |
| Mock veri | Supabase DB boş | Android mock oyun göstermez |
| Canlı veri | Admin publish | Android refresh sonrası oyun görünür |
| Kategori | Admin category SPORT | Android Spor filtresinde görünür |
| Session sync | Oyun bitir | Room kayıt + backend POST |
| Offline | Backend kapalıyken oyun bitir | Sonuç kaybolmaz, queue bekler |
| Retry | Backend açılır | Queue sync olur |

---

## 6. Riskler ve mitigasyon

### Risk 1 — Kullanıcı “Supabase direkt Android’den okunmalı” diye bekliyor olabilir

**Değerlendirme:** Bu projede direct Android→Supabase mimarisi mevcut güvenlik kararlarıyla çelişir.

**Mitigasyon:** Supabase bağlantısı backend üzerinden kurulacak. Android sadece NestJS API ile konuşacak. Bu hem RLS/service_role sızıntısı riskini azaltır hem offline queue/idempotency tasarımını korur.

### Risk 2 — Seed kapatılınca beta ortamında oyun listesi boş kalabilir

**Mitigasyon:**

- Prod/beta deploy öncesi explicit seed/publish script çalıştırılır.
- Admin’den en az bir `PUBLISHED` oyun doğrulanır.
- Android boş state düzgün gösterir.

### Risk 3 — Profil top-level olunca sistem back davranışı değişebilir

**Mitigasyon:**

- Bottom nav tab back policy netleştirilir.
- Sistem back aktif tab stack’i boşsa Home’a döner veya app exit standardı uygulanır.

### Risk 4 — `CATALOG` enum/string refactor debug extras’ı bozabilir

**Mitigasyon:**

- `albago.startDestination=GAMES` korunur.
- Eski `CATALOG` alias varsa 1 sürüm boyunca `GAMES`’e redirect edilir.

### Risk 5 — Admin `buildDemoDraft` mock gibi görünse de editör template’i olarak gerekli

**Mitigasyon:**

- Runtime data fallback kaldırılır.
- Admin “yeni oyun taslağı oluşturma” template helper’ları test fixture değilse korunur.
- Dosya adları ve açıklamalar netleştirilir: `buildTemplateDraft`, `publicCreatableTemplates`.

---

## 7. Rollback planı

Her commit ayrı geri alınabilir olmalı.

```bash
# Son commit rollback
git revert HEAD

# Belirli commit rollback
git revert <commit_sha>
```

Acil geri dönüş sırası:

1. Eğer Android açılış/kritik crash varsa Commit 1 veya 2 revert.
2. Eğer oyunlar hiç gelmiyorsa Commit 5 revert veya backend `AUTO_SEED_DEMO_GAMES=true` sadece staging’de geçici açılır.
3. Eğer backend prod’da DB bağlantısı yüzünden açılmıyorsa env düzeltilir; `ALLOW_IN_MEMORY_FALLBACK` prod’da açılmaz.

---

## 8. Üretim öncesi final doğrulama

```bash
# Backend
npm.cmd run prisma:generate --workspace backend
npm.cmd run build --workspace backend
npm.cmd run test --workspace backend

# Admin
npm.cmd run build --workspace admin

# Android
cd android
./gradlew.bat :core_runtime:testDebugUnitTest --no-daemon
./gradlew.bat :core_network:compileDebugKotlin :core_data:compileDebugKotlin :feature_games:compileDebugKotlin --no-daemon
./gradlew.bat testDebugUnitTest --no-daemon
./gradlew.bat :app:assembleDebug --no-daemon
```

Fiziksel cihaz kabul:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:3000 tcp:3000
adb shell am start -n com.alba.app/com.alba.app.MainActivity
```

Manuel kabul:

```txt
[ ] Ana sayfa neon tasarım korunuyor.
[ ] Profil navbar ile açılıyor.
[ ] Oyunlar canlı endpoint’ten geliyor.
[ ] Oyun başlatma çalışıyor.
[ ] Oyun bitiş sonucu neon ve tekil ekran.
[ ] Eski katalog route/sayfa yok.
[ ] Oyun sonucu local + server sync çalışıyor.
[ ] Admin publish sonrası Android refresh ile oyun geliyor.
```

---

## 9. “Fikrimi ne değiştirir?” notu

Bu planın Android’in Supabase’e doğrudan bağlanmaması kararını değiştirecek tek güçlü neden şudur:

- Backend’in tamamen kaldırılması ve uygulamanın Supabase Auth + RLS ile client-first tasarıma taşınması yönünde açık mimari kararı alınır.

Bu proje dökümünde ise bunun tersi yönde kanıt var: backend tek sync giriş noktası, Room local-first store, WorkManager queue ve Prisma/Supabase PostgreSQL kalıcı katmanı zaten tasarlanmış. Bu yüzden mevcut hedef için en güvenli ve en az kırıcı çözüm backend-mediated Supabase senkronudur.
