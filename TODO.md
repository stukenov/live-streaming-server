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

---

## 1. Критическое: имя продукта

Текущее рабочее имя CLI — `lss`. Это проблема:
- `lss` в одном символе от `ls` — самой частой команды в Unix
- Нулевая семантика — пользователь не поймёт что это
- Коллизия с `lss` (list segments) на некоторых системах

**Рекомендация: `livestream`**

| Критерий | Оценка |
|----------|--------|
| Можно продиктовать по телефону | Да — обычное английское слово |
| CLI читается естественно | `livestream start`, `livestream status` |
| Пакетные менеджеры | `brew install livestream`, `apt install livestream` |
| Гуглится | "livestream server" — однозначный запрос |
| Запасные варианты | `go-livestream`, `livestream-server` |

- [ ] Принять решение по имени продукта
- [ ] Зарегистрировать имя в npm, brew, Docker Hub

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
