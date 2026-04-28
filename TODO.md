# Live Streaming Server — Roadmap

> Цель: сделать систему настолько простой, что непрофессионал сможет скачать один файл, запустить и стримить.
> Подход: Apple HIG — ясность, уважение к пользователю, глубина.

---

## Содержание

1. [Критическое: имя продукта](#1-критическое-имя-продукта)
2. [Архитектурное решение: Go single-binary](#2-архитектурное-решение-go-single-binary)
3. [Фаза 1: UX для новичков](#3-фаза-1-ux-для-новичков-месяц-1)
4. [Фаза 2: Go single-binary](#4-фаза-2-go-single-binary-месяцы-1-2)
5. [Фаза 3: Desktop-приложение](#5-фаза-3-desktop-приложение-месяц-3)
6. [Фаза 4: Пакетные менеджеры](#6-фаза-4-пакетные-менеджеры-месяц-4)
7. [Фаза 5: Облако и серверы](#7-фаза-5-облако-и-серверы-месяцы-5-6)
8. [Фаза 6: Расширяемость](#8-фаза-6-расширяемость-месяцы-5-7)
9. [Фаза 7: Enterprise](#9-фаза-7-enterprise-месяцы-7-12)
10. [CI/CD для дистрибуции](#10-cicd-для-дистрибуции)
11. [AI-функции: архитектура и приоритизация](#11-ai-функции-архитектура-и-приоритизация)

---

## 1. Критическое: имя продукта

**Решение: `tuken`** (от фамилии Tukenov)

| Критерий | Оценка |
|----------|--------|
| Можно продиктовать по телефону | Да — 2 слога, понятно на любом языке |
| CLI читается естественно | `tuken start`, `tuken status`, `tuken stop` |
| Пакетные менеджеры | `brew install tuken`, `apt install tuken` |
| Гуглится | "tuken streaming" — нулевая конкуренция |
| Ассоциация | Созвучно с "token" — tech/security коннотация |
| Личный бренд | Производное от Tukenov |

**Доступность проверена (2026-04-28):**

| Платформа | Статус |
|-----------|--------|
| npm | Свободно |
| PyPI | Свободно |
| Homebrew | Свободно |
| Snap Store | Свободно |
| crates.io | Свободно |
| Winget | Свободно |
| Docker Hub | Юзер есть (0 образов), `tukenov` свободен |

- [x] Принять решение по имени продукта — **tuken**
- [ ] Зарегистрировать `tuken` в npm
- [ ] Зарегистрировать `tukenov` в Docker Hub
- [ ] Создать Homebrew tap `stukenov/homebrew-tap`

---

## 2. Архитектурное решение: Go single-binary

### Почему Go, а не Tauri/Electron

Ключевой факт: **MediaMTX уже написан на Go**. Это определяет всё.

| Подход | Размер | Зависимости | Кросс-компиляция |
|--------|--------|-------------|-------------------|
| **Go single-binary** | ~30-50 МБ | Ноль | `GOOS=windows go build` |
| Tauri | ~10 МБ + Go binary | Rust toolchain, системный webview | Сложная |
| Electron | 150-300 МБ | Chromium, Node.js | Средняя |

**Go-бинарник объединяет все 4 сервиса в один файл:**

```
livestream (Go binary)
├── MediaMTX (встроен как Go-библиотека или бинарник)
├── API (6 эндпоинтов, переписаны на Go — ~80 строк)
├── Dashboard (статические файлы Next.js через go:embed)
└── Player (статические файлы через go:embed)
```

Пользователь скачивает один файл. Нет runtime-зависимостей. Нет Node.js, нет Docker.

Примеры продуктов с таким же подходом: Caddy, Plex, Jellyfin, MediaMTX.

**Что происходит с NestJS API?** Текущие 6 эндпоинтов — это прокси к MediaMTX API. На Go это ~80 строк кода без фреймворков. NestJS-версия остаётся для тех, кто предпочитает Node.js-стек.

- [ ] Создать `cmd/livestream/main.go` — Go supervisor
- [ ] Импортировать MediaMTX как Go-библиотеку (или embed binary)
- [ ] Переписать 6 API-эндпоинтов на Go (`net/http`)
- [ ] Перевести Next.js dashboard на `output: 'export'` (чистый статический HTML)
- [ ] Встроить Dashboard и Player через `go:embed`
- [ ] Настроить graceful shutdown (SIGTERM/SIGINT)

---

## 3. Фаза 1: UX для новичков (месяц 1)

> Принцип: расстояние от "скачал" до "вижу своё видео" — единственная метрика adoption.

### 3.1. Скрипт установки с сопровождением

Сейчас `docker compose up` предполагает, что Docker установлен и пользователь знает что это.

Что нужно: `./setup.sh`, который:
1. Проверяет Docker — если нет, объясняет как установить (конкретные команды для macOS/Ubuntu)
2. Проверяет порты — если заняты, говорит какой процесс и как освободить
3. Генерирует `.env` с настоящим session secret
4. Запускает сервисы
5. Выводит URL-адреса

Каждая ошибка объясняет: **что произошло**, **почему**, **что делать**.

```
Live Streaming Server — Установка

  Docker .............. найден
  Порт 1935 .......... свободен
  Порт 3000 .......... свободен
  Окружение .......... настроено

Ваш стриминговый сервер запущен:

  Панель управления:  http://localhost:3000
  Стримить на:        rtmp://localhost:1935/live/my-stream
```

- [ ] Создать `setup.sh` с проверками Docker, портов, генерацией .env
- [ ] Добавить проверку платформы (macOS/Linux/WSL)
- [ ] Красивый вывод без лишних технических деталей

### 3.2. Редизайн пустого состояния дашборда

Когда пользователь открывает `http://localhost:3000` впервые, он видит иконку базы данных и "No active connections". Это самый критический момент — и он ничего не даёт.

По принципу Apple: пустые экраны — это моменты обучения. Фото не показывает "Нет фото". Оно показывает как импортировать.

Что нужно: карточка-онбординг с прогрессивным раскрытием:
- **OBS Studio** (рекомендуется) — разворачиваемая пошаговая инструкция
- **FFmpeg** (для технарей) — готовая команда для копирования
- Примечание: "Страница обновляется автоматически. Стрим появится через несколько секунд."

- [ ] Заменить пустое состояние на карточку-онбординг с `<details>`
- [ ] Добавить бейдж "Рекомендуется" к OBS
- [ ] Добавить копируемые команды FFmpeg
- [ ] Примечание об авто-обновлении

### 3.3. Исправить InfoCard — он подрывает доверие

`rtmp://your-server:1935` — ложь, когда пользователь запущен на localhost. Копирование не сработает. Это самое вредное для уверенности новичка.

По принципу Clarity: если значение динамическое — показывай настоящее.

- [ ] Использовать `window.location.hostname` для реального адреса
- [ ] Добавить кнопки копирования к каждому URL
- [ ] Заменить "Embed Code" на "Watch at" с реальным HLS URL

### 3.4. Шапка приложения с навигацией

Сейчас `layout.tsx` — голый: ни навигации, ни заголовка. Страница выглядит как прототип.

По принципу Depth: навигация устанавливает контекст и создаёт пространство для роста.

- [ ] Добавить header с backdrop blur (паттерн Apple)
- [ ] Название "Live Streaming Server" + навигация (Streams, будущее: Settings, Recordings)
- [ ] Индикатор здоровья — зелёная точка "Connected" / красная "Disconnected"
- [ ] Загрузка шрифтов Geist через `next/font`
- [ ] Metadata: `<title>`, `<meta description>`

### 3.5. Человечные сообщения об ошибках

Сейчас: "API error: 500". Нужно: "Сервер недоступен. Проверьте: `docker compose ps`".

По паттерну Apple: каждая ошибка содержит **что случилось**, **почему**, **что делать**.

| Сейчас | Должно быть |
|--------|-------------|
| "Failed to load media connections" | "Сервер не отвечает. API по адресу {url} недоступен. Проверьте запущены ли сервисы." |
| "API error: 502" | "Медиа-сервер оффлайн. Перезапустите: `docker compose restart media`" |
| "Access denied: invalid session" | "Сессия истекла. Обновите страницу." |

- [ ] Создать `lib/errors.ts` с маппингом кодов на человечные сообщения
- [ ] Применить к dashboard API client
- [ ] Применить к player server

### 3.6. Почистить mediamtx.yml

720 строк, 80% — закомментированные дефолты и захардкоженные пути Windows. Утечка внутренней инфраструктуры.

- [ ] Сократить до ~25 строк осознанных настроек
- [ ] Убрать все захардкоженные пути и личные данные
- [ ] Добавить ссылку на полную документацию MediaMTX

---

## 4. Фаза 2: Go single-binary (месяцы 1-2)

> Цель: один скачиваемый файл, который запускает весь стриминговый сервер.

### 4.1. Ядро Go-приложения

```
cmd/
  livestream/
    main.go          # Точка входа, CLI-парсинг
    serve.go         # Запуск всех сервисов
    version.go       # Версия и билд-информация
internal/
  api/
    handler.go       # 6 HTTP-эндпоинтов (прокси к MediaMTX)
    middleware.go     # CORS, logging
  dashboard/
    embed.go         # go:embed статических файлов Next.js
  player/
    embed.go         # go:embed статических файлов плеера
  media/
    mediamtx.go      # Управление MediaMTX процессом
  config/
    config.go        # Чтение config.yml
  tray/
    tray.go          # Системный трей (macOS/Windows/Linux)
```

- [ ] Инициализировать Go-модуль: `go mod init github.com/stukenov/live-streaming-server`
- [ ] Реализовать CLI с cobra или встроенным `flag`
- [ ] Реализовать `livestream serve` — запуск всех сервисов
- [ ] Реализовать `livestream version`
- [ ] Реализовать `livestream status`

### 4.2. Встраивание MediaMTX

MediaMTX лицензирован под MIT. Два подхода:

**Вариант A (предпочтительный):** Импорт как Go-библиотеки. Полный контроль: конфигурация через Go-структуры, управление жизненным циклом, общая память для метрик.

**Вариант B (прагматичный для v1):** Embed бинарника. При старте извлечь во временную директорию и запустить как child process. Управление через HTTP API (:9997).

- [ ] Исследовать возможность импорта MediaMTX как Go-библиотеки
- [ ] Если нет — реализовать embed + child process
- [ ] Тестирование на всех платформах (macOS arm64, Linux amd64, Windows amd64)

### 4.3. CLI-интерфейс

```
livestream                    # Статус если запущен, help если нет
livestream serve              # Запуск в foreground (логи в stdout)
livestream start              # Запуск как фоновый демон
livestream stop               # Остановка демона
livestream status             # Состояние, порты, активные стримы
livestream config             # Показать/открыть конфигурацию
livestream config set <k> <v> # Установить значение
livestream logs               # Tail логов
livestream update             # Проверить и применить обновления
livestream version            # Версия, платформа, билд
```

Принципы дизайна:
- Каждая команда производит вывод. Нет тихого успеха.
- Ошибки включают решение: "Порт 1935 занят. Запустите `livestream config set rtmp.port 1936`"
- `--json` флаг на каждой команде для скриптов
- Цветной вывод по умолчанию, уважает `NO_COLOR`
- Exit codes: 0 успех, 1 ошибка, 2 конфликт портов, 3 нет прав

- [ ] Реализовать все команды CLI
- [ ] Добавить `--json` вывод
- [ ] Цветной вывод с поддержкой `NO_COLOR`
- [ ] Документированные exit codes

### 4.4. Конфигурационный файл

Расположение по стандартам ОС:
- macOS: `~/Library/Application Support/Livestream/config.yml`
- Linux: `~/.config/livestream/config.yml`
- Windows: `%APPDATA%\Livestream\config.yml`

```yaml
server:
  host: 0.0.0.0
  dashboard_port: 3000
  hls_port: 8888
  rtmp_port: 1935

storage:
  recordings_path: ~/livestream-recordings
  max_recording_age: 7d

ui:
  auto_open_browser: true
  theme: system   # system | light | dark

updates:
  auto_check: true
  channel: stable  # stable | beta
```

- [ ] Реализовать чтение config.yml
- [ ] Автоматическое создание при первом запуске
- [ ] Команда `livestream config set` для изменения
- [ ] XDG-совместимые пути на каждой ОС

---

## 5. Фаза 3: Desktop-приложение (месяц 3)

> Цель: непрофессионал скачивает и устанавливает как OBS Studio — без терминала.

### 5.1. macOS: .dmg

Пользовательский путь:
1. Скачивает `LivestreamServer-1.0.0-arm64.dmg` с сайта
2. Открывает — видит классический macOS-установщик (иконка → Applications)
3. Запускает из Applications. Gatekeeper-промпт (приложение нотаризовано)
4. В menu bar появляется иконка антенны. Анимируется кратко = "запускается"
5. Через 2-3 секунды открывается браузер на `http://localhost:3000`
6. Menu bar: зелёная точка. Выпадающее меню: Status, Open Dashboard, Settings, Quit

Техническая реализация:
- Go binary обёрнут в `.app` bundle (`Info.plist`, `Contents/MacOS/`, `Contents/Resources/`)
- Нотаризация через `notarytool` (требуется Apple Developer аккаунт, $99/год)
- `.dmg` создаётся через `create-dmg`
- System tray через `github.com/getlantern/systray`
- LaunchAgent plist для автозапуска (опционально)

- [ ] Создать .app bundle структуру
- [ ] Интегрировать системный трей (getlantern/systray)
- [ ] Автооткрытие браузера при первом запуске
- [ ] Получить Apple Developer аккаунт
- [ ] Настроить нотаризацию в CI
- [ ] Создание .dmg через create-dmg

### 5.2. Windows: .exe установщик

Пользовательский путь:
1. Скачивает `LivestreamServer-1.0.0-win-x64-setup.exe`
2. Запускает. UAC-промпт. Кнопка "Install" — без визардов, без выбора компонентов
3. Установка в `C:\Program Files\Livestream Server\`. Ярлык в Start Menu. Автозапуск в трее
4. Установщик завершается, галочка "Запустить Livestream Server" (включена по умолчанию)
5. Иконка в трее, браузер открывает Dashboard

Также предоставить: `LivestreamServer-1.0.0-portable.zip` — zip с одним .exe, для тех кто не доверяет установщикам.

- [ ] Создать Inno Setup скрипт для установщика
- [ ] Добавить правило Windows Firewall для портов 1935, 3000, 8888
- [ ] Портативный .zip с одним .exe
- [ ] Опционально: регистрация как Windows Service (для headless)
- [ ] Опционально: подпись кода (code signing certificate)

### 5.3. Linux: .AppImage + .deb + .rpm

Пользовательский путь (AppImage):
1. Скачивает `LivestreamServer-1.0.0-x86_64.AppImage`
2. `chmod +x` и запуск (или двойной клик в файловом менеджере)
3. Иконка в трее, браузер открывает Dashboard

.deb и .rpm регистрируют systemd-сервис для headless-использования.

- [ ] Создать AppImage через `appimagetool`
- [ ] Создать .deb и .rpm через `nfpm` (Go-инструмент)
- [ ] Systemd unit file в deb/rpm пакетах
- [ ] Post-install скрипт: создание пользователя `livestream`, директорий

### 5.4. Авто-обновления

По модели Plex/Sparkle:
1. При запуске (и каждые 24 часа) проверяет GitHub Releases API
2. Если есть новая версия — синяя точка на иконке трея
3. Пользователь кликает "Update" — скачивание, проверка checksum, замена, перезапуск

Никаких принудительных обновлений. Тихое уведомление, действие по желанию.

- [ ] Реализовать auto-updater через `go-github-selfupdate`
- [ ] Проверка checksum перед заменой
- [ ] Уведомление в трее, не принудительное

### 5.5. Детекция GUI/Headless

```go
func hasDisplay() bool {
    if runtime.GOOS == "linux" {
        return os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != ""
    }
    if runtime.GOOS == "darwin" {
        return os.Getenv("SSH_TTY") == ""
    }
    return true
}
```

- **GUI режим** (по умолчанию): системный трей, авто-открытие браузера
- **Headless режим** (`livestream serve --headless` или авто): без трея, без браузера, логи в stdout

- [ ] Реализовать детекцию наличия дисплея
- [ ] Автоматический переключение GUI/headless
- [ ] Флаг `--headless` для принудительного режима

---

## 6. Фаза 4: Пакетные менеджеры (месяц 4)

> Цель: установка одной командой на любой платформе.

### 6.1. Homebrew (macOS + Linux)

```bash
brew install stukenov/tap/livestream
# после попадания в core:
brew install livestream
```

- [ ] Создать Homebrew tap: `stukenov/homebrew-tap`
- [ ] Formula скачивает pre-built binary с GitHub Releases
- [ ] `brew services start livestream` через launchd/systemd
- [ ] GitHub Action для автообновления формулы при новом релизе

### 6.2. APT (Debian/Ubuntu)

```bash
curl -fsSL https://livestream-server.dev/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/livestream.gpg
echo "deb [signed-by=/usr/share/keyrings/livestream.gpg] https://livestream-server.dev/apt stable main" | sudo tee /etc/apt/sources.list.d/livestream.list
sudo apt update && sudo apt install livestream
```

- [ ] .deb пакеты через `nfpm` в CI
- [ ] APT-репозиторий на Cloudflare R2 или Packagecloud
- [ ] Post-install: systemd сервис, пользователь `livestream`, `/var/lib/livestream/`
- [ ] GPG-подпись пакетов

### 6.3. Snap Store

```bash
sudo snap install livestream
```

- [ ] Создать `snapcraft.yaml` (base: core22, confinement: strict)
- [ ] Публикация в Snap Store
- [ ] Тестирование strict confinement (сетевые порты)

### 6.4. Windows: Winget + Scoop + Chocolatey

```powershell
winget install stukenov.livestream    # Приоритет — Microsoft официальный
scoop install livestream              # Для разработчиков
choco install livestream              # Для enterprise
```

- [ ] Winget: манифест в `microsoft/winget-pkgs` (автосабмит при релизе)
- [ ] Scoop: создать bucket `stukenov/scoop-livestream`
- [ ] Chocolatey: создать .nuspec пакет

### 6.5. npm (для Node.js-разработчиков)

```bash
npx livestream
# или
npm install -g livestream
```

npm-пакет — обёртка (~5KB JS), которая скачивает правильный бинарник для платформы. По модели Prisma/esbuild/Turbo.

- [ ] Опубликовать npm-пакет с `postinstall` скриптом
- [ ] Детекция `os.platform()` + `os.arch()`
- [ ] Скачивание бинарника с GitHub Releases

### 6.6. Docker Hub + GHCR

```bash
docker pull stukenov/livestream
docker run -d -p 1935:1935 -p 3000:3000 -p 8888:8888 stukenov/livestream
```

В дополнение к текущему docker-compose — **single-container** образ с Go-бинарником.

- [ ] Опубликовать на Docker Hub и GitHub Container Registry
- [ ] Multi-arch: `linux/amd64` + `linux/arm64` через buildx
- [ ] Single-container образ (Alpine + Go binary)

---

## 7. Фаза 5: Облако и серверы (месяцы 5-6)

### 7.1. One-Click Deploy кнопки

Высокий leverage для adoption. Каждая кнопка — 1-2 часа настройки.

- [ ] **DigitalOcean**: `do-app-spec.yaml` + кнопка "Deploy to DO" в README
- [ ] **Railway**: `railway.toml` + кнопка "Deploy on Railway"
- [ ] **Render**: `render.yaml` (Blueprint) + кнопка "Deploy to Render"
- [ ] **Coolify**: документация для docker-compose deployment

### 7.2. Kubernetes Helm Chart

```bash
helm repo add livestream https://stukenov.github.io/livestream-helm
helm install my-stream livestream/livestream
```

```
charts/livestream/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml     # Go binary
│   ├── service.yaml        # ClusterIP + NodePort/LoadBalancer
│   ├── ingress.yaml        # Nginx/Traefik (optional)
│   ├── configmap.yaml      # mediamtx.yml + env vars
│   ├── pvc.yaml            # Persistent volume для записей
│   └── hpa.yaml            # Autoscaler (future)
```

- [ ] Создать Helm chart
- [ ] `ingress.enabled: false` по умолчанию
- [ ] `persistence.enabled: true`, 10Gi PVC
- [ ] Тестирование на minikube и kind

### 7.3. Ansible Role

```yaml
- hosts: streaming_servers
  roles:
    - role: livestream
      livestream_version: "1.0.0"
      livestream_domain: "stream.example.com"
      livestream_tls: true
```

- [ ] Создать Ansible role
- [ ] Скачивание binary, systemd сервис, конфигурация
- [ ] Опционально: Caddy/Nginx reverse proxy с TLS

---

## 8. Фаза 6: Расширяемость (месяцы 5-7)

### 8.1. Интерфейс медиа-провайдера

Абстракция для поддержки альтернативных серверов (Nginx-RTMP, Wowza, Oven MediaEngine).

```go
type MediaProvider interface {
    Name() string
    ListPaths() ([]MediaPath, error)
    GetPath(name string) (*MediaPath, error)
    KickPath(name string) error
    Health() HealthStatus
}
```

Добавление нового провайдера = один файл + регистрация. Dashboard не меняется.

- [ ] Определить интерфейс MediaProvider
- [ ] Реализовать MediaMTXProvider
- [ ] Плагинная система загрузки провайдеров

### 8.2. Флаги фич через конфигурацию

```yaml
features:
  recording: true
  player: true
  webrtc: false
  auth: false
```

API условно регистрирует модули. Dashboard показывает/скрывает UI.

- [ ] Реализовать чтение feature flags из config.yml
- [ ] Условная регистрация в Go-приложении
- [ ] Dashboard адаптируется к включённым фичам

### 8.3. Семантические дизайн-токены

Заменить захардкоженные цвета на токены:
- `text-blue-600` → `text-primary`
- `border-l-green-500` → `border-l-[var(--status-live)]`
- `bg-blue-50/30` → `bg-primary/5`

```css
:root {
  --status-live: oklch(0.72 0.19 145);
  --status-offline: oklch(0.63 0.24 29);
  --status-pending: oklch(0.80 0.15 85);
}
```

Смена всего оформления = редактирование одного CSS-файла.

- [ ] Определить семантические токены для статусов
- [ ] Заменить все прямые цвета Tailwind в компонентах
- [ ] Поддержка dark/light theme через CSS variables

### 8.4. Абстракция плеера

```
player/
  server.js
  players/
    hls/
      index.html
      config.js
    webrtc/        # будущее
      index.html
      config.js
  middleware/
    session.js
    cors.js
```

Добавление нового плеера = папка с `index.html` + `config.js`.

- [ ] Извлечь middleware (session, CORS) в отдельные модули
- [ ] Создать структуру `players/` с роутингом по типу
- [ ] `GET /play/:type/:stream` — выбор плеера

### 8.5. Версионирование API

Префикс `/v1` ко всем роутам. Стоит ничего сейчас, спасает всё потом.

- [ ] Добавить `/v1/` префикс ко всем эндпоинтам
- [ ] Health check остаётся без версии: `GET /`
- [ ] Добавить `version` в ответ health check

### 8.6. Система вебхуков/событий

```go
type StreamEvent struct {
    Type      string    // stream.started, stream.stopped, stream.error
    Stream    string
    Timestamp time.Time
    Metadata  map[string]interface{}
}
```

Открывает: Slack-уведомления, автопосты в соцсети, аналитические пайплайны, кастомные триггеры записи.

- [ ] Определить типы событий
- [ ] Dispatcher с регистрацией webhook URL
- [ ] Retry с exponential backoff
- [ ] UI для управления вебхуками в Dashboard

---

## 9. Фаза 7: Enterprise (месяцы 7-12)

### 9.1. Terraform

```hcl
module "livestream" {
  source        = "stukenov/livestream/aws"
  instance_type = "t3.medium"
  domain        = "stream.example.com"
}
```

- [ ] Terraform модуль для AWS (compute + SG + DNS)
- [ ] Terraform модуль для DigitalOcean
- [ ] Terraform модуль для Hetzner

### 9.2. Мультитенантность

При добавлении БД — проектировать с `tenant_id` сразу:

```
Tenant
  → Streams (scoped by tenant)
  → API Keys (scoped by tenant)
  → Settings (per-tenant overrides)
  → Usage metrics (per-tenant)
```

- [ ] Схема БД с tenant_id
- [ ] API key аутентификация
- [ ] Per-tenant изоляция

### 9.3. Enterprise аутентификация

- [ ] LDAP/Active Directory интеграция
- [ ] OIDC/SAML SSO
- [ ] Role-based access control (RBAC)

### 9.4. Kubernetes Operator (только при доказанном спросе)

CRDs: `StreamingServer`, `Stream`, `RecordingPolicy`. Только если Helm chart наберёт 100+ установок.

- [ ] CRD определения
- [ ] Reconciliation loop
- [ ] Auto-scaling по количеству зрителей

---

## 10. CI/CD для дистрибуции

Один `git tag v1.0.0` push должен произвести все артефакты автоматически.

### Release Workflow

```
on: push tags: ['v*']

jobs:
  build-go:        # 5 platform/arch комбинаций
  package-macos:   # Universal binary → .app → sign → notarize → .dmg
  package-windows: # Inno Setup installer + portable .zip
  package-linux:   # .deb + .rpm + .AppImage через nfpm
  docker:          # Multi-arch Docker image → Hub + GHCR
  publish:         # GitHub Release + обновление Homebrew/Winget/Scoop/npm
```

- [ ] GitHub Actions workflow для Go cross-compilation (6 targets)
- [ ] macOS: universal binary (lipo) + codesign + notarytool + create-dmg
- [ ] Windows: Inno Setup + code signing
- [ ] Linux: nfpm для .deb/.rpm + appimagetool
- [ ] Docker buildx multi-arch (amd64 + arm64)
- [ ] Автоматическое обновление Homebrew tap при релизе
- [ ] Автоматический PR в microsoft/winget-pkgs
- [ ] Публикация npm wrapper-пакета
- [ ] GitHub Release с checksums и changelog

---

## Сводная таблица

| Фаза | Что | Усилия | Эффект на adoption |
|------|-----|--------|--------------------|
| **1** | UX для новичков (скрипт, пустое состояние, ошибки) | 1 неделя | Критический |
| **2** | Go single-binary | 3-4 недели | Фундаментальный |
| **3** | Desktop (.dmg, .exe, AppImage) | 2-3 недели | Массовый |
| **4** | Пакетные менеджеры (brew, apt, snap, winget) | 2 недели | Высокий |
| **5** | Облако (Helm, one-click deploy) | 2 недели | Средний |
| **6** | Расширяемость (провайдеры, фичи, темы) | 3-4 недели | Долгосрочный |
| **7** | Enterprise (Terraform, multi-tenant, SSO) | 2-3 месяца | Монетизация |

---

## Референсы: чему учиться у других продуктов

| Продукт | Модель дистрибуции | Что взять |
|---------|--------------------|-----------|
| **Plex** | Single binary, системный трей, браузер UI, авто-обновления | Модель "трей + браузер" идеальна для медиа-серверов |
| **Jellyfin** | Установщики per-platform, Docker, systemd. Полностью open source | Эталон Linux-упаковки (deb/rpm репозитории) |
| **OBS Studio** | Традиционные установщики (.dmg, .exe, Flatpak) | Первый запуск с визардом настройки качества |
| **Home Assistant** | VM image, Docker, pip. Browser UI | One-click deploy кнопки дали массовый adoption |
| **Caddy** | Single Go binary, `go install`, Docker, пакеты | Доказательство что Go single-binary модель масштабируется |

---

> **Главный принцип:** продукт — это сервер. UI — вкладка в браузере. Установщик ставит сервер на машину и уходит с дороги. Простейший путь — по умолчанию, сложность — по запросу.

---

## 11. AI-функции: архитектура и приоритизация

> **Философия:** AI в Tuken — это не маркетинговая галочка, а инфраструктурный слой. Каждая функция должна работать локально, без интернета, без отправки данных на чужие серверы. Облачные API — явный opt-in, никогда не дефолт.
>
> **Принцип HIG Clarity:** AI-функции не должны требовать от пользователя понимания моделей, параметров или пайплайнов. Пользователь включает «Субтитры» — не «Whisper large-v3 с beam_size=5 и VAD threshold 0.35».
>
> **Принцип HIG Deference:** AI-результаты никогда не конкурируют с контентом. Субтитры читаемы, но ненавязчивы. Аналитика доступна, но не загромождает дашборд.

### Архитектурное решение: AI Sidecar

AI-функции реализуются как отдельный сервис `ai/` — Python-процесс, который Go-бинарник запускает как sidecar (аналогично тому, как управляет MediaMTX). Это позволяет:

1. **Изоляция зависимостей** — Python ML-стек не загрязняет Go-бинарник
2. **Опциональность** — если пользователю не нужен AI, сервис не запускается, ноль overhead
3. **GPU passthrough** — Python-процесс естественно работает с CUDA/Metal
4. **Горячая замена моделей** — обновление модели не требует пересборки Go-бинарника

```
livestream (Go binary)
├── MediaMTX (медиа-движок)
├── API (Go net/http)
├── Dashboard (go:embed)
├── Player (go:embed)
└── AI Sidecar (Python, опциональный)
    ├── Whisper/Faster-Whisper (speech-to-text)
    ├── Silero VAD (детекция речи)
    ├── LLaMA/Mistral (локальный LLM)
    └── YOLO/MediaPipe (визуальный анализ)
```

```yaml
# config.yml
ai:
  enabled: false              # По умолчанию ВЫКЛЮЧЕНО
  engine: local               # local | cloud | hybrid
  device: auto                # auto | cpu | cuda | mps (Metal)
  models_path: ~/tuken-models # Где хранить скачанные модели
  cloud:                      # Только если engine: cloud или hybrid
    provider: openai           # openai | anthropic
    api_key: ""
    send_audio: false          # Явный opt-in на отправку аудио
    send_video: false          # Явный opt-in на отправку видео
```

**Docker-интеграция:**

```yaml
# docker-compose.yml — дополнение
  ai:
    image: stukenov/tuken-ai:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]  # Опционально
    volumes:
      - tuken-models:/models
    environment:
      - TUKEN_AI_DEVICE=auto
    profiles:
      - ai  # Запускается только с `docker compose --profile ai up`
```

**Внутренний API sidecar:**

```
POST /ai/transcribe          # Транскрипция аудио-фрагмента
POST /ai/transcribe/stream   # WebSocket: realtime транскрипция
POST /ai/summarize           # Суммаризация текста
POST /ai/detect              # Визуальная детекция в кадре
POST /ai/translate           # Перевод текста
GET  /ai/health              # Статус моделей, GPU, память
GET  /ai/models              # Список доступных/скачанных моделей
POST /ai/models/download     # Скачивание модели
```

- [ ] Создать `ai/` директорию с Python sidecar (FastAPI + uvicorn)
- [ ] Реализовать health endpoint с информацией о GPU/CPU, загруженных моделях
- [ ] Интеграция в Go supervisor: запуск/остановка AI sidecar
- [ ] Docker image `tuken-ai` с предустановленными зависимостями
- [ ] Команда CLI: `tuken ai status`, `tuken ai models list`, `tuken ai models download whisper-large-v3`

---

### P0 — Запуск с этим (категорическое преимущество)

#### P0.1. Живые субтитры (Real-time Captions)

**Что делает:** Распознаёт речь в реальном времени и накладывает субтитры на видео-поток. Субтитры отображаются в плеере как стандартный WebVTT-трек. Зритель может включить/выключить, выбрать размер шрифта, позицию.

**Кому нужнее всего:**
- **Церкви и религиозные организации** — глухие и слабослышащие прихожане. В США ADA (Americans with Disabilities Act) требует обеспечения доступности. Для церквей с 50+ прихожанами это не роскошь, а юридическая необходимость
- **Университеты** — студенты с нарушениями слуха, иностранные студенты, студенты в шумных местах
- **Государственные органы** — городские советы, публичные слушания: юридическое требование доступности протоколов
- **Здравоохранение** — телемедицина: пациенты с нарушениями слуха

**Почему это P0 (HIG-аргумент):**
Accessibility — это не фича, это обязанность. В терминах Apple HIG: «Accessibility is not a feature you add at the end. It is a fundamental aspect of your app's design.» Ни один self-hosted стриминговый сервер сейчас не предлагает субтитры из коробки. Это мгновенное "wow" — включаешь стрим, субтитры появляются сами. Ни OvenMediaEngine, ни Nginx-RTMP, ни MediaMTX сам по себе этого не дают.

**Как это работает технически:**

```
Аудио-поток (из MediaMTX)
    │
    ▼
Silero VAD (детекция речи)
    │ Отсекает тишину, снижает нагрузку на Whisper
    ▼
Faster-Whisper (распознавание)
    │ Модель: small (для CPU) или large-v3 (для GPU)
    │ Буфер: 3-секундные чанки с 0.5с overlap
    ▼
WebVTT Generator
    │ Форматирование: ≤42 символа/строка, ≤2 строки
    ▼
Доставка зрителю (два пути):
    ├── HLS: .vtt файлы рядом с .ts сегментами (EXT-X-MEDIA TYPE=SUBTITLES)
    └── WebSocket: push на плеер для ultra-low latency
```

**Модели и ресурсы:**

| Модель | Размер | RAM | Скорость (CPU) | Скорость (GPU) | Качество |
|--------|--------|-----|-----------------|-----------------|----------|
| `whisper-tiny` | 75 МБ | ~1 ГБ | Realtime 1x | — | Базовое |
| `whisper-small` | 488 МБ | ~2 ГБ | Realtime 0.5x | Realtime 5x | Хорошее |
| `whisper-medium` | 1.5 ГБ | ~4 ГБ | Ниже realtime | Realtime 3x | Отличное |
| `whisper-large-v3` | 3.1 ГБ | ~6 ГБ | Не realtime | Realtime 2x | Лучшее |

**Рекомендация по умолчанию:** `whisper-small` через Faster-Whisper. На CPU средней мощности (4 ядра) даёт realtime с задержкой ~2-3 секунды. Достаточно для 90% сценариев.

**Автоматический выбор модели:**
```python
def select_model(device: str, available_ram_gb: float) -> str:
    if device == "cuda" and available_ram_gb >= 6:
        return "large-v3"
    if device == "cuda" and available_ram_gb >= 4:
        return "medium"
    if available_ram_gb >= 2:
        return "small"
    return "tiny"
```

**Интеграция в продукт:**

1. **Dashboard** (`dash/src/app/page.tsx`): в `ConnectionCard` — бейдж «CC» рядом со статусом стрима. Клик → настройки субтитров для этого стрима (язык, модель)
2. **Player** (`player/`): `<track kind="captions">` в HLS-плеере. Кнопка CC в контролах плеера. Настройки размера/цвета/фона субтитров (по аналогии с Apple TV)
3. **API**: `GET /media/stream/:name/captions` — текущие субтитры в WebVTT. `PUT /media/stream/:name/captions` — включить/выключить, сменить язык
4. **CLI**: `tuken captions enable my-stream --lang ru`

**Self-hosted соображения:**
- Полностью офлайн: Faster-Whisper + модели хранятся локально
- Первый запуск: автоскачивание `whisper-small` (~500 МБ) с прогресс-баром
- GPU не требуется: работает на CPU, GPU даёт 3-5x ускорение
- Cloud fallback: опционально OpenAI Whisper API для пользователей без мощного железа

- [ ] Интеграция Faster-Whisper в AI sidecar
- [ ] Silero VAD для фильтрации тишины (снижает нагрузку на ~60%)
- [ ] Генерация WebVTT с таймкодами, синхронизированными с HLS-сегментами
- [ ] Инъекция `EXT-X-MEDIA TYPE=SUBTITLES` в HLS-манифест MediaMTX
- [ ] WebSocket endpoint для low-latency субтитров (WebRTC-зрители)
- [ ] UI в плеере: кнопка CC, настройки шрифта/размера/позиции/фона
- [ ] UI в дашборде: toggle субтитров per-stream, выбор языка
- [ ] Автоопределение языка (Whisper делает это нативно)
- [ ] CLI: `tuken captions enable/disable/status`
- [ ] Автоматический выбор модели по доступным ресурсам

---

#### P0.2. Полнотекстовый поиск по архивам (Searchable VOD)

**Что делает:** Каждый записанный стрим автоматически транскрибируется. Транскрипция индексируется. Пользователь ищет «бюджет на следующий квартал» — получает результат с таймкодом, кликает — видео перематывается на это место.

**Кому нужнее всего:**
- **Университеты** — студент пропустил лекцию, ищет «теорема Байеса» — находит момент в 2-часовой записи за секунды
- **Государственные органы** — журналист ищет «решение о застройке участка 14» в архиве городского совета
- **Церкви** — прихожанин хочет переслушать «притча о блудном сыне» из прошлой проповеди
- **Бизнес** — менеджер ищет «что мы решили по ценообразованию» в записи совещания

**Почему это P0 (HIG-аргумент):**
Принцип Direct Manipulation: видео — это чёрный ящик. Без транскрипции 2-часовая запись бесполезна, потому что невозможно найти нужный момент. Поиск по тексту превращает видео в структурированный документ. Это та же трансформация, которую Spotlight сделал с файлами — содержимое становится доступным без знания «где оно лежит».

**Как это работает технически:**

```
Запись завершена (MediaMTX сохраняет .mp4/.ts)
    │
    ▼
Фоновый worker (очередь задач)
    │
    ▼
FFmpeg: извлечение аудио → WAV 16kHz mono
    │
    ▼
Faster-Whisper (с word-level timestamps)
    │ Результат: [{word: "бюджет", start: 142.3, end: 142.8}, ...]
    ▼
SQLite FTS5 (полнотекстовый поиск)
    │ Хранит: stream_id, text, start_time, end_time
    ▼
API: GET /search?q=бюджет → [{stream: "совещание-2024-01", time: "2:22", text: "...бюджет на следующий квартал..."}]
```

**База данных (SQLite — в духе single-binary):**
```sql
CREATE VIRTUAL TABLE transcripts USING fts5(
    stream_id,
    segment_text,
    start_time UNINDEXED,
    end_time UNINDEXED,
    language UNINDEXED,
    tokenize='unicode61'
);
```

**Почему SQLite:** self-hosted продукт не должен требовать PostgreSQL для базовых функций. SQLite встраивается в Go-бинарник через `modernc.org/sqlite` (pure Go, без CGO). FTS5 даёт полнотекстовый поиск на уровне Elasticsearch для объёмов одного сервера (до миллионов записей).

**Интеграция в продукт:**

1. **Dashboard**: новая страница «Recordings» с поиском. Результаты — карточки с превью кадра, текстом, таймкодом. Клик → переход в плеер на нужный момент
2. **API**: `GET /v1/search?q=text&lang=ru&from=2024-01-01` — полнотекстовый поиск. `GET /v1/streams/:id/transcript` — полная транскрипция с таймкодами
3. **Player**: полоса прокрутки с маркерами найденных фрагментов (по аналогии с Apple Podcasts transcript)
4. **CLI**: `tuken search "бюджет" --format json`

**Self-hosted соображения:**
- Полностью офлайн, данные никуда не уходят
- SQLite = ноль зависимостей, файл рядом с записями
- Транскрипция фоновая — не блокирует стрим, не влияет на производительность
- Приоритизация: сначала транскрибируются свежие записи

- [ ] Background worker для транскрипции завершённых записей
- [ ] FFmpeg-пайплайн: извлечение аудио из записей MediaMTX
- [ ] Word-level timestamps из Faster-Whisper
- [ ] SQLite FTS5: схема, индексация, поисковые запросы
- [ ] API endpoint: `GET /v1/search` с пагинацией и фильтрами
- [ ] API endpoint: `GET /v1/streams/:id/transcript` с таймкодами
- [ ] UI страница «Recordings» в дашборде с поисковой строкой
- [ ] UI результатов: превью кадра + текст + таймкод + кнопка «Перейти»
- [ ] Плеер: маркеры на полосе прокрутки для найденных фрагментов
- [ ] CLI: `tuken search` с форматами вывода (text, json, srt)
- [ ] Индикатор прогресса транскрипции в дашборде («Транскрибировано 14 из 23 записей»)

---

#### P0.3. Автоматический перевод субтитров (Multi-language Captions)

**Что делает:** На основе транскрипции (P0.1) генерирует субтитры на других языках. Зритель выбирает язык из списка в плеере — как на YouTube или Netflix, но на своём сервере.

**Кому нужнее всего:**
- **Церкви** — мультиязычные конгрегации: служба на русском, субтитры на кыргызском, казахском, узбекском
- **Университеты** — иностранные студенты: лекция на государственном языке, субтитры на родном
- **Конференции** — международные спикеры и аудитория
- **Государственные органы** — обязательства по обеспечению мультиязычности в многонациональных регионах

**Почему это P0 (HIG-аргумент):**
Internationalization по Apple HIG — это не перевод интерфейса, а уважение к тому, что пользователь думает на своём языке. Живой перевод субтитров устраняет языковой барьер для зрителей. Для Центральной Азии (основной рынок) — это killer feature: служба в церкви на русском, но бабушка читает субтитры на казахском.

**Как это работает технически:**

```
Транскрипция (из P0.1, русский текст)
    │
    ▼
Перевод (два пути):
    ├── Локальный: NLLB-200 (Meta, 600M параметров, ~2 ГБ)
    │   Поддержка: 200 языков, включая казахский, кыргызский, узбекский
    │   Скорость: ~50 предложений/сек на CPU
    │   Качество: хорошее для близких языков, среднее для далёких
    │
    └── Cloud (opt-in): GPT-4o / Claude API
        Качество: отличное, включая контекст и идиомы
        Стоимость: ~$0.01 за минуту субтитров
    │
    ▼
WebVTT на каждый язык → HLS мультитрек
```

**Локальная модель — NLLB-200 (No Language Left Behind):**
- Разработана Meta для малоресурсных языков — идеально для ЦА рынка
- 600M параметров — запускается на CPU за ~2 ГБ RAM
- Поддерживает казахский (kaz), кыргызский (kir), узбекский (uzb), таджикский (tgk)
- Не требует интернета после скачивания модели

**Интеграция в продукт:**

1. **Player**: выпадающее меню языков (по аналогии с Apple TV). Иконка глобуса рядом с CC
2. **Dashboard**: настройка целевых языков per-stream. Drag-and-drop для порядка в списке
3. **API**: `PUT /media/stream/:name/captions/languages` — установить список языков
4. **Config**:
```yaml
ai:
  translation:
    engine: local               # local | cloud
    model: nllb-200-distilled   # Лёгкая версия по умолчанию
    target_languages:
      - kk  # Казахский
      - ky  # Кыргызский
      - en  # Английский
```

**Self-hosted соображения:**
- Полностью офлайн с NLLB-200
- Для редких языковых пар или высокого качества — cloud API как opt-in
- Перевод идёт с задержкой ~1-2 секунды поверх задержки субтитров

- [ ] Интеграция NLLB-200 (CTranslate2 для оптимизации) в AI sidecar
- [ ] Pipeline: транскрипция → сегментация по предложениям → перевод → WebVTT
- [ ] HLS мультитрек: отдельный `.vtt` файл на каждый язык
- [ ] UI выбора языка в плеере (выпадающее меню с флагами)
- [ ] Cloud fallback через OpenAI/Anthropic API (настраиваемый)
- [ ] Кэширование переводов: одинаковые фразы не переводятся повторно
- [ ] Настройка целевых языков в дашборде и конфиге

---

### P1 — Быстрое дополнение (расширение рынка)

#### P1.1. Автоматические главы и оглавление (Smart Chapters)

**Что делает:** Анализирует транскрипцию записи и создаёт оглавление с главами. Двухчасовая лекция получает содержание: «0:00 — Введение, 12:34 — Основы теории, 45:12 — Практические примеры, 1:23:45 — Вопросы и ответы». Главы кликабельны в плеере.

**Кому нужнее всего:**
- **Университеты** — студенты перематывают на нужную тему, а не пересматривают всё
- **Конференции** — доклады по 6 часов: без глав архив бесполезен
- **Церкви** — «Найти момент с молитвой» в 2-часовой службе
- **Бизнес** — «Перейти к обсуждению KPI» в записи совещания

**Почему это P1 (HIG-аргумент):**
Progressive Disclosure в чистом виде. Вместо плоского 2-часового видео — структурированный документ с навигацией. Как оглавление в книге: оно не обязательно для чтения, но без него книга из 500 страниц становится стеной текста. Apple Podcasts добавил главы — та же идея.

**Как это работает технически:**

```
Транскрипция (из P0.2, с таймкодами)
    │
    ▼
Локальный LLM (LLaMA 3.1 8B / Mistral 7B, через llama.cpp)
    │ Промпт: "Разбей транскрипцию на логические главы. 
    │          Для каждой главы дай таймкод начала и название (до 60 символов)."
    │ Контекст: ~4000 токенов (5-7 минут речи за раз, скользящее окно)
    ▼
Структура глав:
    [{title: "Введение и повестка", start: 0}, {title: "Финансовый отчёт Q3", start: 742}, ...]
    │
    ▼
HLS: EXT-X-DATERANGE маркеры в манифесте
Player: интерактивная навигация по главам
```

**Ресурсы:**

| Модель | RAM | Скорость | Качество глав |
|--------|-----|----------|---------------|
| `llama-3.1-8b-q4` | ~5 ГБ | ~30 tok/s (CPU) | Хорошее |
| `mistral-7b-q4` | ~4.5 ГБ | ~35 tok/s (CPU) | Хорошее |
| `llama-3.1-8b-q4` (GPU) | ~5 ГБ VRAM | ~100 tok/s | Хорошее |
| Cloud (GPT-4o) | — | Мгновенно | Отличное |

**Интеграция:**

1. **Player**: полоса глав над timeline (как в YouTube). Наведение → название главы. Клик → переход
2. **Dashboard**: страница записи с оглавлением. Редактирование названий глав (AI предлагает, человек утверждает)
3. **API**: `GET /v1/streams/:id/chapters` — список глав. `PUT /v1/streams/:id/chapters` — ручная правка

- [ ] Интеграция llama.cpp (через Python bindings) в AI sidecar
- [ ] Промпт для разбиения транскрипции на главы
- [ ] Скользящее окно: обработка длинных записей чанками
- [ ] UI глав в плеере: маркеры на timeline + боковое оглавление
- [ ] Редактирование глав в дашборде (AI-предложение + ручная правка)
- [ ] Экспорт глав: YouTube-формат (для описания), JSON, VTT chapters
- [ ] Cloud fallback через GPT-4o / Claude API

---

#### P1.2. Модерация контента (Content Moderation)

**Что делает:** Анализирует аудио и видео поток на наличие нежелательного контента: нецензурная лексика в речи, неприемлемые визуальные элементы. Действия: заглушение аудио (bleep), уведомление оператору, автоматическая остановка стрима (настраивается).

**Кому нужнее всего:**
- **Церкви** — гости могут выйти в эфир с неприемлемым контентом
- **Школы/университеты** — юридическая ответственность за контент
- **Государственные органы** — публичные слушания: граждане иногда используют нецензурную лексику
- **Спортивные клубы** — комментаторы в эмоциональных моментах

**Почему это P1 (HIG-аргумент):**
Безопасность пользователя — фундаментальный принцип Apple. «People need to feel safe.» Организации, стримящие публичные мероприятия, юридически обязаны фильтровать контент. Без модерации стриминг — это правовой риск, который удерживает организации от использования продукта.

**Как это работает технически:**

```
Аудио-поток
    │
    ▼
Транскрипция (из P0.1)
    │
    ▼
Словарный фильтр (быстрый, локальный)
    │ Regex + словари нецензурной лексики по языкам
    │ Латентность: <1мс
    │
    ▼
Действие (настраивается):
    ├── log     — запись в журнал модерации
    ├── notify  — WebSocket push оператору в дашборд
    ├── bleep   — замена аудио-фрагмента на тишину/тон (через FFmpeg)
    └── stop    — остановка стрима + уведомление

Видео-поток (опционально):
    │
    ▼
YOLO / NudeNet (визуальная модерация)
    │ 1 кадр каждые 2 секунды (не каждый кадр — это бессмысленно)
    │ NSFW-классификация: safe | suggestive | explicit
    ▼
Действие: аналогично аудио
```

**Словари модерации (не ML — просто словари, работают на любом железе):**
- Русский, казахский, кыргызский, английский — встроенные
- Пользовательские словари: файл `moderation_words.txt` в конфиге
- Настраиваемая чувствительность: strict (церковь) / moderate (университет) / relaxed (спорт)

**Интеграция:**

1. **Dashboard**: панель модерации — лента событий в реальном времени. Красные алерты для explicit, жёлтые для suggestive. Кнопки «Заглушить» и «Отключить стрим» для оператора
2. **API**: `GET /v1/moderation/events` — лента. `PUT /v1/moderation/policy` — настройка правил. WebSocket для live-алертов
3. **Config**:
```yaml
ai:
  moderation:
    enabled: false
    sensitivity: moderate       # strict | moderate | relaxed
    audio:
      action: notify            # log | notify | bleep | stop
      custom_words_file: ""     # Путь к словарю
    video:
      enabled: false            # Визуальная модерация отдельно
      action: notify
      check_interval: 2s        # Частота проверки кадров
```

- [ ] Словарные фильтры нецензурной лексики (русский, казахский, кыргызский, английский)
- [ ] Пользовательские словари через конфиг-файл
- [ ] Realtime WebSocket уведомления оператору в дашборд
- [ ] Аудио-заглушение (bleep) через FFmpeg-фильтр в реальном времени
- [ ] Визуальная модерация через YOLO/NudeNet (опционально, GPU рекомендуется)
- [ ] UI панели модерации в дашборде: лента событий + управление
- [ ] Настраиваемые профили чувствительности (strict/moderate/relaxed)
- [ ] Журнал модерации с возможностью экспорта (для юридических целей)

---

#### P1.3. Умный мониторинг качества стрима (Stream Health AI)

**Что делает:** Анализирует технические параметры стрима и предупреждает о проблемах до того, как зрители их заметят. «Битрейт упал ниже 1500 kbps — качество пострадает через 10 секунд. Причина: вероятно, сетевая перегрузка.»

**Кому нужнее всего:**
- **Все аудитории** — но особенно нетехнические: церкви, школы, малый бизнес. У них нет DevOps, который следит за Grafana.

**Почему это P1 (HIG-аргумент):**
Принцип Anticipation. Apple Watch предупреждает о высоком пульсе до сердечного приступа. Tuken предупреждает о проблемах стрима до того, как зрители уйдут. Нетехнический пользователь не читает графики битрейта — ему нужно человеческое предложение: «Качество падает. Закройте другие программы, использующие интернет.»

**Как это работает технически:**

```
MediaMTX API (метрики каждые 2 секунды)
    │ bytes_received, bytes_sent, uptime, codec info
    │
    ▼
Детектор аномалий (не ML — простая эвристика):
    │ 1. Скользящее среднее битрейта (окно 30 сек)
    │ 2. Порог: если текущий < 60% от среднего → предупреждение
    │ 3. Если bytes_received = 0 > 5 сек → стрим мёртв
    │ 4. Если аудио есть, видео нет → пропал видео-трек
    │
    ▼
Человеческая диагностика:
    ├── "Битрейт упал с 4500 до 1200 kbps. Проверьте сетевое соединение стримера."
    ├── "Стрим не отправляет данные 10 секунд. OBS отключился?"
    ├── "Видео-трек пропал, аудио продолжается. Камера отключена?"
    └── "Буферизация у зрителей: HLS сегменты создаются медленнее, чем воспроизводятся."
```

**Это НЕ требует ML.** Простые правила + хорошие сообщения. Вычислительная стоимость: ноль.

**Интеграция:**

1. **Dashboard** (`ConnectionCard`): цветной индикатор здоровья (зелёный/жёлтый/красный). При наведении — человеческое объяснение. Пульсирующая анимация при проблемах (Depth)
2. **Уведомления**: WebSocket push в дашборд. Опционально: webhook для Telegram/Slack/email
3. **API**: `GET /v1/streams/:name/health` — текущее здоровье + рекомендации
4. **CLI**: `tuken health my-stream`

- [ ] Сбор метрик из MediaMTX API каждые 2 секунды
- [ ] Эвристический детектор: скользящее среднее, пороги, dead-stream detection
- [ ] Генерация человеческих диагностических сообщений (не "bitrate < threshold", а "Качество падает")
- [ ] Цветной индикатор здоровья в ConnectionCard (зелёный/жёлтый/красный)
- [ ] WebSocket уведомления при смене статуса здоровья
- [ ] Webhook для внешних уведомлений (Telegram, Slack, email)
- [ ] История здоровья стрима (sparkline-график в карточке)

---

### P2 — Рост (повышение retention и engagement)

#### P2.1. Автоматическая нарезка хайлайтов (Smart Clips)

**Что делает:** После стрима анализирует запись и предлагает клипы для социальных сетей. Критерии: аплодисменты/смех (аудио-анализ), эмоциональные пики в речи, визуальные изменения (смена слайда, жест).

**Кому нужнее всего:**
- **Контент-криейторы/геймеры** — клипы для TikTok, YouTube Shorts, Instagram Reels
- **Конференции** — «Лучшие моменты» для соцсетей после мероприятия
- **Спортивные клубы** — голы, спорные моменты, красивые розыгрыши
- **Церкви** — цитаты из проповеди для публикации

**Почему это P2 (HIG-аргумент):**
Direct Manipulation: пользователь не должен монтировать видео вручную. AI предлагает, пользователь утверждает одним кликом. Как Live Photos на iPhone — система сама выбирает лучший момент, но пользователь может поправить.

**Как это работает технически:**

```
Запись + Транскрипция (из P0.2)
    │
    ▼
Детекция интересных моментов (мультимодальный анализ):
    │
    ├── Аудио: Silero VAD + амплитудный анализ
    │   - Аплодисменты (высокая амплитуда, широкий спектр)
    │   - Смех (характерный паттерн)
    │   - Возгласы (резкий рост громкости)
    │
    ├── Текст: ключевые слова + сентимент (через LLM)
    │   - "Важно", "Внимание", "Итого" — маркеры сути
    │   - Эмоциональные фрагменты (LLM-оценка)
    │
    └── Видео (опционально): YOLO + motion detection
        - Смена слайда (гистограмма кадра резко меняется)
        - Рост количества людей в кадре (YOLO: person count)
    │
    ▼
Ранжирование моментов по "интересности" (score 0-100)
    │
    ▼
Top-N фрагментов → FFmpeg нарезка:
    - Вертикальный (9:16) для Stories/Reels/TikTok
    - Горизонтальный (16:9) для YouTube
    - Квадрат (1:1) для Instagram/Facebook
```

**Интеграция:**

1. **Dashboard**: страница записи → вкладка «Clips». Карусель предложенных клипов с превью. Drag для коррекции границ. Кнопка «Export» с выбором формата/соотношения
2. **API**: `GET /v1/streams/:id/clips` — предложенные клипы. `POST /v1/streams/:id/clips/:clip_id/export` — экспорт с параметрами
3. **CLI**: `tuken clips my-stream --format vertical --top 5`

- [ ] Аудио-анализ: детекция аплодисментов, смеха, пиков громкости (через librosa)
- [ ] Текстовый анализ: ключевые слова + сентимент через LLM
- [ ] Визуальный анализ: смена слайда, motion detection (OpenCV)
- [ ] Ранжирование моментов и автовыбор top-N
- [ ] FFmpeg нарезка в трёх соотношениях (9:16, 16:9, 1:1)
- [ ] UI карусели клипов в дашборде с drag-коррекцией границ
- [ ] Экспорт с наложением субтитров (hardcoded для соцсетей)

---

#### P2.2. AI-сводка стрима (Stream Summary)

**Что делает:** После стрима генерирует структурированную сводку: ключевые темы, решения, вопросы, action items. Отправляется по email или в мессенджер.

**Кому нужнее всего:**
- **Бизнес** — протокол совещания без человека, который конспектирует
- **Университеты** — конспект лекции для студентов
- **Государственные органы** — протокол заседания с юридической точностью
- **Церкви** — краткое содержание проповеди для рассылки

**Почему это P2 (HIG-аргумент):**
Принцип Remove Test — сводка убирает необходимость пересматривать видео для тех, кому нужна только суть. Это уважение к времени пользователя (Deference).

**Как это работает технически:**

```
Транскрипция (из P0.2, полный текст)
    │
    ▼
Локальный LLM (LLaMA 3.1 8B / Mistral 7B)
    │ Промпт: "Создай структурированную сводку:
    │  1. Основные темы (3-5)
    │  2. Ключевые решения
    │  3. Вопросы, которые обсуждались
    │  4. Action items (если есть)
    │  Объём: 200-400 слов."
    │
    │ Для длинных записей: MapReduce
    │ - Map: суммаризация 10-минутных чанков
    │ - Reduce: объединение суммарий в финальную сводку
    ▼
Форматирование:
    ├── Markdown (для дашборда, email)
    ├── JSON (для API, интеграций)
    └── PDF (для печати, архива)
```

**Интеграция:**

1. **Dashboard**: вкладка «Summary» на странице записи. Редактируемый текст (AI предлагает, человек правит)
2. **Уведомления**: автоотправка сводки по email/Telegram/Slack (через вебхуки из 8.6)
3. **API**: `GET /v1/streams/:id/summary`. `POST /v1/streams/:id/summary/regenerate`

- [ ] Промпт-инженеринг для структурированных сводок
- [ ] MapReduce для длинных записей (>30 минут)
- [ ] Экспорт: Markdown, JSON, PDF
- [ ] Интеграция с вебхуками для автоотправки
- [ ] UI вкладки «Summary» в дашборде

---

#### P2.3. Аналитика зрителей по речевому контенту (Content Analytics)

**Что делает:** Связывает данные о контенте (какие темы обсуждались) с данными о зрителях (когда уходили, когда приходили). Ответ на вопрос: «На каких темах мы теряем аудиторию?»

**Кому нужнее всего:**
- **Контент-криейторы** — оптимизация контента по retention
- **Университеты** — «На каком моменте лекции студенты отвлекаются?»
- **Бизнес** — «Какая часть вебинара самая ценная для клиентов?»

**Почему это P2 (HIG-аргумент):**
Information at a Glance. Графики retention сами по себе — данные. Привязка к темам — это информация. Привязка к действиям («перенести эту тему в начало») — это знание. Apple Watch показывает не «ваш BPM 142» а «ваш пульс выше обычного. Отдохните.»

**Как это работает:**

```
Данные о зрителях (HLS-сессии: подключения/отключения)
    +
Главы (из P1.1)
    +
Транскрипция (из P0.2)
    │
    ▼
Корреляция: "При обсуждении [тема X] ушло 12% зрителей"
    ▼
Визуализация: heatmap retention поверх timeline с главами
```

- [ ] Сбор событий подключения/отключения зрителей (из HLS-логов MediaMTX)
- [ ] Корреляция viewer retention с транскрипцией/главами
- [ ] UI: heatmap retention на timeline (зелёный = рост аудитории, красный = потеря)
- [ ] Рекомендации: «Тема X теряет зрителей. Попробуйте перенести её ближе к началу»

---

### P3 — Защитный ров (конкурентное преимущество и lock-in)

#### P3.1. Голосовой ассистент стримера (Streamer Co-pilot)

**Что делает:** Во время стрима стример может голосом давать команды: «Покажи слайд 5», «Запусти таймер на 10 минут», «Создай опрос: кому понравилась лекция?», «Переключи камеру». AI распознаёт команду и выполняет действие.

**Кому нужнее всего:**
- **Соло-стримеры** — нет оператора, руки заняты
- **Преподаватели** — переключение слайдов голосом, создание опросов по ходу лекции
- **Церкви** — пастор управляет стримом голосом, без технического волонтёра

**Почему это P3 (HIG-аргумент):**
Direct Manipulation в чистом виде — голос как интерфейс. Устраняет необходимость в операторе для простых действий. Это уровень «Siri для стриминга».

**Как это работает:**
- Wake word detection (Porcupine / Snowboy, локально)
- Whisper для распознавания команды
- Парсинг intent через локальный LLM или rule-based
- Выполнение через внутренний API

- [ ] Исследование: wake word detection (Porcupine open-source vs Snowboy)
- [ ] Маппинг голосовых команд на API-действия
- [ ] Обработка ambient шума (фильтрация фоновой музыки/речи)
- [ ] UI индикатор: «Слушаю...» в дашборде

---

#### P3.2. Автоматическая мультикамера (AI Director)

**Что делает:** При нескольких камерах (несколько RTMP-потоков) AI автоматически переключает между ними: крупный план говорящего, общий план при аплодисментах, слайд при смене слайда.

**Кому нужнее всего:**
- **Церкви** — 2-3 камеры, но нет оператора-режиссёра
- **Спортивные клубы** — несколько камер на стадионе
- **Конференции** — камера на спикера + камера на зал

**Почему это P3 (HIG-аргумент):**
Самый дорогой и сложный, но создаёт непреодолимый конкурентный ров. Ни один self-hosted продукт не предлагает AI-режиссуру. Это функция, которую OBS + vMix дают только с человеком-оператором.

**Как это работает:**
- YOLO: детекция лиц и людей в каждом потоке
- Audio source detection: какой микрофон/камера ближе к говорящему
- Rule engine: «Если говорит спикер → крупный план. Если аплодисменты → общий план. Если слайд изменился → слайд-камера»
- FFmpeg: переключение между потоками в реальном времени

**Ресурсы:** требует GPU. YOLO inference на 2-3 потоках = ~4 ГБ VRAM.

- [ ] YOLO face/person detection на нескольких потоках
- [ ] Audio source correlation с видео-потоками
- [ ] Rule engine для автопереключения
- [ ] FFmpeg/GStreamer: compositing в реальном времени
- [ ] UI: превью всех камер + индикатор активной

---

#### P3.3. Персональный поиск с контекстом (Semantic Search)

**Что делает:** Вместо ключевых слов — семантический поиск. «Момент, когда обсуждали сокращение бюджета» — находит фрагмент, даже если слово «бюджет» не произносилось (но говорили «урезать расходы»).

**Кому нужнее всего:**
- **Все сегменты** с большими архивами (государство, университеты, бизнес)

**Почему это P3:**
Превращает видеоархив в базу знаний организации. Lock-in: чем больше записей — тем ценнее поиск — тем сложнее мигрировать.

**Как это работает:**
- Embedding модель: `all-MiniLM-L6-v2` (22 МБ, работает на CPU)
- Векторный поиск: SQLite + `sqlite-vss` или встроенный HNSW-индекс
- Гибрид: FTS5 (ключевые слова) + векторный поиск (семантика), результаты объединяются

- [ ] Интеграция embedding-модели (all-MiniLM-L6-v2) в AI sidecar
- [ ] Индексация транскрипций в векторный индекс
- [ ] Гибридный поиск: FTS5 + vector search
- [ ] UI: переключатель «Точный поиск» / «Умный поиск» в строке поиска

---

### Сводная таблица AI-функций

| Приоритет | Функция | Модели | CPU-only | GPU-boost | Офлайн | Усилия |
|-----------|---------|--------|----------|-----------|--------|--------|
| **P0.1** | Живые субтитры | Faster-Whisper + Silero VAD | Да (small) | 3-5x | Да | 3-4 нед |
| **P0.2** | Поиск по архивам | Faster-Whisper + SQLite FTS5 | Да | 3-5x | Да | 2-3 нед |
| **P0.3** | Перевод субтитров | NLLB-200 | Да | 2x | Да | 2 нед |
| **P1.1** | Умные главы | LLaMA/Mistral 7-8B | Медленно | 3x | Да | 2 нед |
| **P1.2** | Модерация | Словари + YOLO (опц.) | Да | Для видео | Да | 2-3 нед |
| **P1.3** | Здоровье стрима | Эвристики (без ML) | Да | — | Да | 1 нед |
| **P2.1** | Хайлайты/клипы | VAD + LLM + OpenCV | Медленно | 3x | Да | 3-4 нед |
| **P2.2** | Сводка стрима | LLaMA/Mistral 7-8B | Медленно | 3x | Да | 1-2 нед |
| **P2.3** | Аналитика контента | Эвристики + корреляция | Да | — | Да | 2 нед |
| **P3.1** | Голосовой ассистент | Porcupine + Whisper + LLM | Да | Лучше | Да | 4-5 нед |
| **P3.2** | AI-режиссёр | YOLO + FFmpeg | Нет | Требует | Да | 6-8 нед |
| **P3.3** | Семантический поиск | MiniLM + sqlite-vss | Да | 2x | Да | 2-3 нед |

### Минимальные системные требования

| Уровень | CPU | RAM | GPU | Что работает |
|---------|-----|-----|-----|-------------|
| **Базовый** (RPi 4+, VPS 2 ядра) | Любой x64/arm64 | 2 ГБ | — | P1.2 (словари), P1.3 (эвристики) |
| **Стандартный** (4 ядра, типичный ноутбук) | 4+ ядер | 8 ГБ | — | + P0.1 (субтитры small), P0.2 (поиск), P0.3 (перевод) |
| **Продвинутый** (8 ядер, GPU) | 8+ ядер | 16 ГБ | 6+ ГБ VRAM | + P1.1 (главы), P2.1 (клипы), P2.2 (сводки) |
| **Максимальный** (GPU-сервер) | 16+ ядер | 32 ГБ | 12+ ГБ VRAM | Всё, включая P3.2 (AI-режиссёр) |

### Порядок реализации

```
Месяц 1-2: AI Sidecar + P0.1 (субтитры) + P1.3 (здоровье)
           ↓ Это даёт мгновенный "wow" момент
Месяц 2-3: P0.2 (поиск) + P1.2 (модерация)
           ↓ Открывает рынок церквей, школ, государства
Месяц 3-4: P0.3 (перевод) + P1.1 (главы)
           ↓ Мультиязычность — killer feature для ЦА
Месяц 4-5: P2.1 (клипы) + P2.2 (сводки)
           ↓ Retention: пользователи возвращаются ради AI-генерации
Месяц 5-6: P2.3 (аналитика) + P3.3 (семантический поиск)
           ↓ Lock-in: ценность архива растёт со временем
Месяц 7+:  P3.1 (голосовой ассистент) + P3.2 (AI-режиссёр)
           ↓ Защитный ров: конкуренты не повторят быстро
```

### Принципы дизайна AI-функций (HIG-манифест)

1. **Opt-in, никогда не opt-out.** AI выключен по умолчанию. Пользователь сознательно включает каждую функцию. Никаких сюрпризов.

2. **Данные не покидают сервер без явного разрешения.** Если `ai.cloud.send_audio: false` — ни один байт аудио не уйдёт в интернет. Это контракт, не настройка.

3. **AI предлагает, человек утверждает.** Главы, клипы, сводки — всегда показываются как предложения с кнопкой «Принять» / «Отредактировать». Никогда не публикуются автоматически.

4. **Деградация с достоинством.** Нет GPU — работает на CPU, медленнее, но работает. Нет 8 ГБ RAM — используется tiny модель, хуже, но работает. Нет интернета — всё работает офлайн.

5. **Прозрачность ресурсов.** Дашборд показывает: «AI использует 2.1 ГБ RAM, 34% CPU». Пользователь понимает стоимость. Как Activity Monitor в macOS.

6. **Один переключатель.** `ai.enabled: true` — и субтитры, модерация, поиск начинают работать с разумными дефолтами. Не нужно конфигурировать 47 параметров. По аналогии с «Turn on FileVault» — одна кнопка, вся сложность скрыта.

7. **Accessibility first.** Субтитры — это P0 не потому что это круто, а потому что без них продукт недоступен для людей с нарушениями слуха. Перевод — P0 не для маркетинга, а потому что языковой барьер — это барьер доступности.
