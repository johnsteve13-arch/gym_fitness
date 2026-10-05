# Entity Relationship Diagram (ERD) — Apex Iron Athletic Club

This document visualizes the complete database schema for the **Fitness Gym Management Platform** currently deployed on **TiDB Cloud**.

---

## 1. Visual Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o| MEMBERS : "profile for"
    USERS ||--o| TRAINERS : "profile for"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOGS : "triggers"

    MEMBERS ||--o{ MEMBERSHIPS : "subscribes"
    MEMBERS ||--o{ ATTENDANCES : "checks in"
    MEMBERS ||--o{ WORKOUT_LOGS : "logs"
    MEMBERS ||--o{ BODY_MEASUREMENTS : "tracks"
    MEMBERS ||--o{ CLASS_BOOKINGS : "attends"
    MEMBERS ||--o{ TRAINER_BOOKINGS : "books"
    MEMBERS ||--o{ PAYMENTS : "billed"
    MEMBERS ||--o{ REWARD_TRANSACTIONS : "earns/redeems"
    MEMBERS ||--o{ AI_ACTIVITY_SCORES : "analyzed by AI"
    MEMBERS ||--o{ WORKOUT_PROGRAMS : "assigned"

    MEMBERSHIP_PLANS ||--o{ MEMBERSHIPS : "defines terms"

    TRAINERS ||--o{ WORKOUT_PROGRAMS : "authors"
    TRAINERS ||--o{ GYM_CLASSES : "coaches"
    TRAINERS ||--o{ TRAINER_BOOKINGS : "instructs"

    WORKOUT_PROGRAMS ||--o{ WORKOUT_EXERCISES : "contains"
    WORKOUT_LOGS ||--o{ WORKOUT_LOG_ENTRIES : "contains sets"

    GYM_CLASSES ||--o{ CLASS_BOOKINGS : "reservations"
    REWARDS ||--o{ REWARD_TRANSACTIONS : "redeemed in"

    USERS {
        string id PK
        string email UK
        string password_hash
        enum role "super_admin | admin | trainer | member"
        string first_name
        string last_name
        string phone
        enum status "active | suspended | inactive"
        datetime created_at
    }

    MEMBERS {
        string id PK
        string user_id FK,UK
        string member_code UK
        string qr_code UK
        datetime date_of_birth
        enum gender "male | female | non_binary | other"
        string emergency_contact_name
        string emergency_contact_phone
        int reward_points_balance
        string fitness_goals
    }

    TRAINERS {
        string id PK
        string user_id FK,UK
        string specialization
        text bio
        decimal hourly_rate
        decimal rating
        int experience_years
        int max_clients
    }

    MEMBERSHIP_PLANS {
        string id PK
        string name
        string code UK
        int duration_days
        decimal price "PHP"
        enum plan_type "trial | standard | premium | student"
        json benefits
        int max_classes_per_week
        boolean has_trainer_access
    }

    MEMBERSHIPS {
        string id PK
        string member_id FK
        string plan_id FK
        datetime start_date
        datetime end_date
        enum status "active | expired | frozen | cancelled | pending"
        boolean auto_renew
        int frozen_days_remaining
    }

    ATTENDANCES {
        string id PK
        string member_id FK
        datetime check_in_time
        datetime check_out_time
        enum access_method "qr_code | member_id | staff_override"
        int duration_minutes
        string staff_notes
    }

    WORKOUT_PROGRAMS {
        string id PK
        string trainer_id FK
        string member_id FK
        string title
        enum difficulty "beginner | intermediate | advanced"
        string goal
        int duration_weeks
    }

    WORKOUT_EXERCISES {
        string id PK
        string program_id FK
        string exercise_name
        int target_sets
        int target_reps
        decimal target_weight_kg
        int rest_interval_seconds
    }

    WORKOUT_LOGS {
        string id PK
        string member_id FK
        datetime workout_date
        int duration_minutes
        decimal total_volume_kg
        int personal_record_count
        text notes
    }

    WORKOUT_LOG_ENTRIES {
        string id PK
        string workout_log_id FK
        string exercise_name
        int set_number
        int reps
        decimal weight_kg
        boolean is_personal_record
    }

    BODY_MEASUREMENTS {
        string id PK
        string member_id FK
        datetime recorded_at
        decimal weight_kg
        decimal height_cm
        decimal bmi
        decimal body_fat_percentage
        decimal muscle_mass_kg
        decimal waist_cm
        decimal chest_cm
        decimal arms_cm
        decimal legs_cm
    }

    GYM_CLASSES {
        string id PK
        string trainer_id FK
        string name
        enum category "yoga | crossfit | zumba | hiit | strength"
        int day_of_week
        string start_time
        int duration_minutes
        int max_capacity
    }

    CLASS_BOOKINGS {
        string id PK
        string class_id FK
        string member_id FK
        datetime class_date
        enum booking_status "confirmed | waitlisted | cancelled | attended"
        int waitlist_position
    }

    TRAINER_BOOKINGS {
        string id PK
        string trainer_id FK
        string member_id FK
        datetime session_date
        string start_time
        decimal fee "PHP"
        enum session_status "pending | confirmed | completed | cancelled"
    }

    PAYMENTS {
        string id PK
        string transaction_id UK
        string invoice_number UK
        string member_id FK
        decimal amount "PHP"
        decimal discount_amount
        decimal net_amount "PHP"
        string currency "PHP"
        string payment_method
        enum payment_status "completed | pending | failed | refunded"
        enum payment_type "membership | trainer_session | class_dropin | store"
    }

    REWARDS {
        string id PK
        string title
        text description
        int points_required
        string category
        int stock_quantity
    }

    REWARD_TRANSACTIONS {
        string id PK
        string member_id FK
        string reward_id FK
        int points
        enum transaction_type "earned_attendance | earned_workout | redeemed"
    }

    AI_ACTIVITY_SCORES {
        string id PK
        string member_id FK
        decimal engagement_score
        enum churn_risk_level "low | medium | high | critical"
        decimal attendance_rate
        decimal workout_consistency_rate
        text recommended_action
    }

    NOTIFICATIONS {
        string id PK
        string user_id FK
        string title
        text message
        string notification_type
        boolean is_read
    }

    AUDIT_LOGS {
        string id PK
        string user_id FK
        string action
        string entity
        string entity_id
        text details
        string ip_address
    }
```

---

## 2. How to Preview Tables and Live Data

### Method 1: Prisma Studio (Recommended Instant Visual GUI)
Prisma includes a graphical database browser built right into this project:
1. Open PowerShell and run:
   ```powershell
   cd "c:\Users\USER\Documents\New folder\backend"
   $env:DATABASE_URL="mysql://248UeewrweHakYk.root:kPvi8In5JOX0qUiu@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/gym_fitness?sslaccept=strict"
   cmd.exe /c "npx prisma studio"
   ```
2. Your browser will automatically open **`http://localhost:5555`**.
3. You can click into every single table, inspect foreign key relationships, search records, and edit live data with a rich visual UI!

---

### Method 2: In TiDB Cloud Web Console
1. In your browser, open **[tidbcloud.com](https://tidbcloud.com)** and open your **`gym-fitness`** cluster.
2. In the left navigation menu, click **SQL Editor** (or **Data Service**).
3. On the left panel under database objects:
   - Select database: **`gym_fitness`**.
   - Click on any table name (e.g. `users`, `members`, `payments`, `memberships`).
   - Click the **Schema** tab at the top to see columns, constraints, foreign keys, and indexes.
   - Click the **Data** tab to see table rows and live records.

---

### Method 3: Using DBeaver or MySQL Workbench (1-Click Visual ERD)
If you want an auto-generated visual diagram with draggable tables:
1. Download [DBeaver Community](https://dbeaver.io/) (Free).
2. Click **New Database Connection** $\rightarrow$ select **MySQL**.
3. Enter your TiDB Cloud credentials:
   - **Host**: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
   - **Port**: `4000`
   - **Database**: `gym_fitness`
   - **Username**: `248UeewrweHakYk.root`
   - **Password**: `kPvi8In5JOX0qUiu`
   - **SSL**: Check "Require SSL".
4. Once connected, right-click on the database `gym_fitness` $\rightarrow$ select **View Diagram**.
5. DBeaver will render a full interactive, draggable ERD diagram with all foreign keys and tables.
