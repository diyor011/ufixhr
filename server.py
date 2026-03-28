from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3, requests, os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

UZB_TZ = ZoneInfo("Asia/Tashkent")

def now_uzb():
    return datetime.now(UZB_TZ).replace(tzinfo=None)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(BASE_DIR, "frontend", "dist")   # Vite builds to dist/

app = Flask(__name__, static_folder=BUILD_DIR, static_url_path="")
CORS(app)

DB = os.path.join(BASE_DIR, "attendance.db")

DEFAULT_EMPLOYEES = [
    ("#A770", "Abdulloh", "16:00", "None"),
    ("#L470", "Mubina",   "00:00", "None"),
    ("#D370", "Davlat",   "16:00", "None"),
    ("#D870", "Davron",   "08:00", "None"),
    ("#J660", "Laziz",    "08:00", "None"),
    ("#P710", "Ibrohim",  "00:00", "None"),
    ("#J450", "Yusuf",    "16:00", "None"),
    ("#A777", "Bobur",    "08:00", "None"),
    ("#C333", "Abdulaziz","00:00", "None"),
]

def init_db():
    conn = sqlite3.connect(DB)
    conn.execute("""CREATE TABLE IF NOT EXISTS attendance(
        id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id TEXT,
        checkin TEXT, checkout TEXT, late INTEGER, week TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS employees(
        id TEXT PRIMARY KEY, name TEXT, shift TEXT, off_day TEXT DEFAULT 'None')""")
    cols = [r[1] for r in conn.execute("PRAGMA table_info(employees)").fetchall()]
    if "off_day" not in cols:
        conn.execute("ALTER TABLE employees ADD COLUMN off_day TEXT DEFAULT 'None'")
    if conn.execute("SELECT COUNT(*) FROM employees").fetchone()[0] == 0:
        for e in DEFAULT_EMPLOYEES:
            conn.execute("INSERT OR IGNORE INTO employees VALUES (?,?,?,?)", e)
    conn.commit(); conn.close()
    print(f"[DB] Ready: {DB}")

init_db()

BOT_TOKEN   = "8758406348:AAEjNIPMChEc1gZ3IQlh7aUCShVwutGHOFU"
MANAGER_IDS = ["5952683615", "39730332", "8473394162"]

def tg_send(text):
    for cid in MANAGER_IDS:
        try:
            requests.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": cid, "text": text}, timeout=5)
        except Exception as e: print(f"[TG] {e}")

def tg_photo(photo_bytes, caption):
    for cid in MANAGER_IDS:
        try:
            requests.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto",
                data={"chat_id": cid, "caption": caption},
                files={"photo": ("checkin.jpg", photo_bytes, "image/jpeg")}, timeout=10)
        except Exception as e: print(f"[TG PHOTO] {e}")

def get_db():
    conn = sqlite3.connect(DB); conn.row_factory = sqlite3.Row; return conn

def get_month_key(dt): return f"{dt.year}-M{dt.month:02d}"

def get_shift_times(shift, now):
    h = int(shift.split(":")[0])
    if h == 8:
        s = now.replace(hour=8,  minute=0, second=0, microsecond=0)
        e = now.replace(hour=16, minute=0, second=0, microsecond=0)
    elif h == 16:
        s = now.replace(hour=16, minute=0, second=0, microsecond=0)
        e = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        base = (now + timedelta(days=1)) if now.hour >= 20 else now
        s = base.replace(hour=0, minute=0, second=0, microsecond=0)
        e = s + timedelta(hours=8)
    return s, e

def calc_late(shift, now):
    s, _ = get_shift_times(shift, now)
    diff = int((now - s).total_seconds() / 60)
    if diff <= 0:
        return 0   # пришёл вовремя или раньше
    if diff > 480:
        return 0   # больше 8 часов — смена уже прошла
    return diff

def fmt_late(m):
    if m <= 0: return "✅ On time"
    h, r = m//60, m%60
    return (f"⏰ {h}h {r}min late" if h else f"⏰ {m} min late")

def fmt_total(m):
    if m <= 0: return "0 min"
    h, r = m//60, m%60
    if h and r: return f"{h}h {r}min"
    return f"{h}h" if h else f"{m} min"

SHIFT_LABELS = {"08:00":"Day: 08:00-16:00","16:00":"Main: 16:00-00:00","00:00":"Night: 00:00-08:00"}

# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/today")
def today_status():
    """Returns active check-ins (no checkout yet) keyed by employee_id."""
    conn = get_db()
    rows = conn.execute(
        "SELECT employee_id, checkin, late FROM attendance WHERE checkout IS NULL"
    ).fetchall()
    conn.close()
    return jsonify({r["employee_id"]: {"checkin": r["checkin"], "late": r["late"]} for r in rows})

@app.route("/employees")
def get_employees():
    conn = get_db()
    rows = conn.execute("SELECT id, name, shift, off_day FROM employees").fetchall()
    conn.close()
    return jsonify([{"id":r["id"],"name":r["name"],"shift":r["shift"],"off_day":r["off_day"] or "None"} for r in rows])

@app.route("/checkin", methods=["POST"])
def checkin():
    emp_id     = request.form.get("employee_id")
    photo_file = request.files.get("photo")
    if not emp_id:
        return jsonify({"ok":False,"error":"employee_id required"}), 400
    conn = get_db()
    emp  = conn.execute("SELECT * FROM employees WHERE id=?", (emp_id,)).fetchone()
    if not emp:
        conn.close(); return jsonify({"ok":False,"error":"Employee not found"}), 404
    now   = now_uzb(); shift = emp["shift"]; name = emp["name"]
    # Already checked in?
    if conn.execute("SELECT id FROM attendance WHERE employee_id=? AND checkout IS NULL ORDER BY id DESC LIMIT 1",(emp_id,)).fetchone():
        conn.close(); return jsonify({"ok":False,"error":f"{name} already checked in"}), 409
    # Day off?
    off = emp["off_day"] or "None"
    if off not in ("None","No day off") and off == now.strftime("%A"):
        conn.close(); return jsonify({"ok":False,"error":f"{name} has day off today"}), 403
    # Check-in окно: за 2 часа до смены и до конца смены
    s, e = get_shift_times(shift, now)
    earliest = s - timedelta(hours=2)
    if now < earliest:
        conn.close()
        return jsonify({"ok": False, "error": f"Too early! Check-in opens at {earliest.strftime('%H:%M')}"}), 403
    if now > e:
        conn.close()
        return jsonify({"ok": False, "error": f"Shift already ended! Was {s.strftime('%H:%M')} — {e.strftime('%H:%M')}"}), 403
    late = calc_late(shift, now); week = get_month_key(now)
    conn.execute("INSERT INTO attendance (employee_id,checkin,late,week) VALUES (?,?,?,?)",
                 (emp_id, now.isoformat(), late, week))
    conn.commit()
    month_start = now.replace(day=1,hour=0,minute=0,second=0,microsecond=0)
    row = conn.execute("SELECT SUM(late) FROM attendance WHERE employee_id=? AND checkin>=?",
                       (emp_id,month_start.isoformat())).fetchone()
    total = row[0] or 0; conn.close()
    late_status = f"⏰ Late: {late} min  💸 Fine: ${late}" if late > 0 else "✅ On time"
    cap = (f"🟢 CHECK-IN\n\n👤 {name} {emp_id}\n📋 Shift: {SHIFT_LABELS.get(shift,shift)}\n"
           f"🕒 Time: {now.strftime('%H:%M')}\n{late_status}\n"
           f"📊 Monthly late: {fmt_total(total)}\n💰 Monthly fine: ${total}")
    if photo_file: tg_photo(photo_file.read(), cap)
    else: tg_send(cap)
    return jsonify({"ok":True,"late":late,"fine_today":late,"total_monthly_late":total,"total_monthly_fine":total})

@app.route("/checkout", methods=["POST"])
def checkout():
    data   = request.get_json() or {}
    emp_id = data.get("employee_id")
    if not emp_id:
        return jsonify({"ok":False,"error":"employee_id required"}), 400
    conn = get_db()
    emp  = conn.execute("SELECT * FROM employees WHERE id=?", (emp_id,)).fetchone()
    if not emp:
        conn.close(); return jsonify({"ok":False,"error":"Employee not found"}), 404
    now   = now_uzb(); shift = emp["shift"]; name = emp["name"]
    row = conn.execute("SELECT id,checkin FROM attendance WHERE employee_id=? AND checkout IS NULL ORDER BY id DESC LIMIT 1",(emp_id,)).fetchone()
    if not row:
        conn.close(); return jsonify({"ok":False,"error":f"{name} has no active check-in"}), 404
    ci_dt = datetime.fromisoformat(row["checkin"])
    worked = int((now - ci_dt).total_seconds() / 60)
    _, e  = get_shift_times(shift, now)
    early = max(0, int((e - now).total_seconds() / 60)) if now < e else 0
    if   early >= 60: h,m = early//60,early%60; em = f"\n⚠️ Left {h}h {m}min early!" if m else f"\n⚠️ Left {h}h early!"
    elif early > 0:   em  = f"\n⚠️ Left {early} min early!"
    else:             em  = ""
    conn.execute("UPDATE attendance SET checkout=? WHERE id=?", (now.isoformat(), row["id"]))
    conn.commit(); conn.close()
    wh,wm = worked//60,worked%60
    tg_send(f"🔴 CHECK-OUT\n\n👤 {name} {emp_id}\n📋 Shift: {SHIFT_LABELS.get(shift,shift)}\n"
            f"🕒 Time: {now.strftime('%H:%M')}\n⏱ Worked: {wh}h {wm}min{em}")
    return jsonify({"ok":True,"worked_minutes":worked})


@app.route("/update_offday", methods=["POST"])
def update_offday():
    data   = request.get_json() or {}
    emp_id = data.get("employee_id")
    off_day = data.get("off_day", "No day off")
    if not emp_id:
        return jsonify({"ok": False, "error": "employee_id required"}), 400
    valid = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","No day off","None"]
    if off_day not in valid:
        return jsonify({"ok": False, "error": "invalid off_day value"}), 400
    conn = get_db()
    emp  = conn.execute("SELECT * FROM employees WHERE id=?", (emp_id,)).fetchone()
    if not emp:
        conn.close()
        return jsonify({"ok": False, "error": "Employee not found"}), 404
    conn.execute("UPDATE employees SET off_day=? WHERE id=?", (off_day, emp_id))
    conn.commit()
    conn.close()
    tg_send(f"📅 OFF DAY UPDATED\n\n👤 {emp['name']} {emp_id}\n🗓 Off day: {off_day}")
    return jsonify({"ok": True, "employee_id": emp_id, "off_day": off_day})

# ── React Frontend ────────────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    target = os.path.join(BUILD_DIR, path)
    if path and os.path.exists(target):
        return send_from_directory(BUILD_DIR, path)
    return send_from_directory(BUILD_DIR, "index.html")

if __name__ == "__main__":
    print("✅ Server → http://localhost:5000")
    print(f"📁 React:  {BUILD_DIR}")
    app.run(host="0.0.0.0", port=5000, debug=False)
