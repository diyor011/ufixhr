# UFIX Check-in Site (Web-панель)

## Файлы
- `server.py` — Flask backend (API)
- `index.html` — главная страница (статика)
- `login.html` — страница входа
- `ufix_logo.png` — логотип
- `frontend/` — React (Vite) фронтенд

## Установка backend
```bash
pip install -r requirements.txt
```

## Запуск backend
```bash
python server.py
```
Сервер стартует на http://localhost:5000

## Сборка фронтенда (опционально)
```bash
cd frontend
npm install
npm run build
```
После сборки папка `frontend/dist/` будет автоматически подхвачена `server.py`.

## Подключение к боту
В `server.py` бот и сайт общаются через общую БД `attendance.db`.
Убедись что путь к БД совпадает в `server.py` и `database.py` бота.
