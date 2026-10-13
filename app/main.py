from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.security import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import block, booking, incharge, resource, user
from app.routers import admin, auth, blocks, catalog, client, incharges


BLOCK_RESOURCE_DATA = {
    "A": [
        {"name": "Conference Room", "type": "room"},
        {"name": "Mini Seminar Hall", "type": "hall"},
        {"name": "Projector", "type": "equipment"},
        {"name": "Smart Board", "type": "equipment"},
        {"name": "Sound System", "type": "equipment"},
        {"name": "Seating", "type": "seating", "description": "Benches"},
    ],
    "B": [
        {"name": "Conference Room", "type": "room"},
        {"name": "Mini Seminar Hall", "type": "hall"},
        {"name": "Computer Labs", "type": "lab"},
        {"name": "Projector", "type": "equipment"},
        {"name": "Smart Board", "type": "equipment"},
        {"name": "Sound System", "type": "equipment"},
        {"name": "Seating", "type": "seating", "description": "Chairs + Benches"},
    ],
    "C": [
        {"name": "Conference Room", "type": "room", "floor": "2nd Floor"},
        {"name": "Mini Seminar Hall", "type": "hall", "floor": "Basement"},
        {"name": "Computer Labs", "type": "lab", "floor": "1st & 2nd Floor"},
        {"name": "Geography Department", "type": "department", "floor": "2nd Floor"},
    ],
    "D": [
        {"name": "Conference Room", "type": "room", "floor": "1st Floor"},
        {"name": "Mini Seminar Hall", "type": "hall", "floor": "Basement"},
        {"name": "Labs", "type": "lab", "description": "5 Labs"},
        {"name": "Projectors", "type": "equipment", "description": "20 Projectors"},
    ],
    "E": [
        {"name": "Conference Room", "type": "room", "floor": "Room 112"},
        {"name": "Conference Hall", "type": "hall", "floor": "2nd Floor"},
        {"name": "Innovation Lab", "type": "lab", "floor": "2nd Floor"},
    ],
    "F": [
        {"name": "Mini Seminar Hall", "type": "hall", "floor": "Room 301, 2nd Floor"},
    ],
    "G": [
        {"name": "Conference Room", "type": "room", "floor": "Room 201"},
        {"name": "Skill Center", "type": "center", "floor": "Ground Floor"},
    ],
    "H": [
        {"name": "Computer Lab", "type": "lab", "floor": "2nd Floor"},
        {"name": "Communication Lab", "type": "lab", "floor": "2nd Floor"},
        {"name": "Physics Lab", "type": "lab", "floor": "2nd Floor"},
        {"name": "Biology Lab", "type": "lab", "floor": "2nd Floor"},
        {"name": "Chemistry Lab", "type": "lab", "floor": "3rd Floor"},
        {"name": "Art Gallery", "type": "gallery", "floor": "1st Floor"},
    ],
    "I": [
        {"name": "Conference Room", "type": "room", "floor": "2nd Floor"},
        {"name": "Fuji Electronics Lab", "type": "lab", "floor": "Ground Floor"},
        {"name": "IoT Lab", "type": "lab", "floor": "1st Floor"},
        {"name": "AI-ML Lab", "type": "lab", "floor": "1st Floor"},
        {"name": "AR-VR Lab", "type": "lab", "floor": "1st Floor"},
    ],
}

EXTRA_CENTERS = [
    {
        "name": "Innovation Center",
        "type": "center",
        "floor": "Library Side",
        "description": "Innovation Center (Library Side)",
        "is_extra_center": True,
    },
    {
        "name": "Main Seminar Hall",
        "type": "hall",
        "floor": "Auditorium",
        "description": "Main Seminar Hall (Auditorium)",
        "is_extra_center": True,
    },
]

INCHARGE_DATA = [
    {"block_name": "C Block", "name": "C Block", "contact": "9501115243"},
    {"block_name": "D Block", "name": "Shubhpreet Singh", "contact": "9501115033"},
    {"block_name": "E Block", "name": "Bohar Singh", "contact": "9501115403"},
    {"block_name": "G Block", "name": "Vishal", "contact": None},
    {"block_name": "G Block", "name": "Ravinder", "contact": None},
    {"block_name": "G Block", "name": "Amit", "contact": None},
    {"block_name": "H Block", "name": "Ashwani Goyal", "contact": "9501115142"},
    {"block_name": "H Block", "name": "Ramandeep Singh", "contact": "9501115163"},
    {"block_name": "H Block", "name": "Gurpreet", "contact": "9501115114"},
    {
        "block_name": "I Block",
        "resource_name": "Fuji Electronics Lab",
        "name": "Sumit Sir",
        "contact": "8076771578",
    },
    {
        "block_name": "I Block",
        "resource_name": "IoT Lab",
        "name": "Dr. Amandeep",
        "contact": "9501115428",
    },
    {
        "block_name": "I Block",
        "resource_name": "AR-VR Lab",
        "name": "Inderraj",
        "contact": "9501115467",
    },
    {"block_name": "Extra", "name": "Balkaar Sir", "contact": None},
]


def run_startup_migrations() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as connection:
            if "name" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR(120) NULL"))
            if "uid" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN uid VARCHAR(80) NULL"))
            if "email" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(160) NULL"))
            if "department" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(120) NULL"))
            if "reset_otp_hash" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN reset_otp_hash VARCHAR(255) NULL"))
            if "reset_otp_expires_at" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN reset_otp_expires_at DATETIME NULL"))
            if "reset_otp_sent_at" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN reset_otp_sent_at DATETIME NULL"))

    if "resources" in table_names:
        resource_columns = {column["name"] for column in inspector.get_columns("resources")}
        with engine.begin() as connection:
            if "floor" not in resource_columns:
                connection.execute(text("ALTER TABLE resources ADD COLUMN floor VARCHAR(120) NULL"))
            if "is_extra_center" not in resource_columns:
                connection.execute(
                    text("ALTER TABLE resources ADD COLUMN is_extra_center BOOLEAN NOT NULL DEFAULT 0")
                )
            if "block_id" in resource_columns:
                try:
                    connection.execute(text("ALTER TABLE resources MODIFY COLUMN block_id INTEGER NULL"))
                except SQLAlchemyError:
                    pass

            for unique_constraint in inspector.get_unique_constraints("resources"):
                columns = unique_constraint.get("column_names") or []
                name = unique_constraint.get("name")
                if columns == ["name"] and name:
                    try:
                        connection.execute(text(f"ALTER TABLE resources DROP INDEX {name}"))
                    except SQLAlchemyError:
                        pass
            for index in inspector.get_indexes("resources"):
                columns = index.get("column_names") or []
                name = index.get("name")
                if index.get("unique") and columns == ["name"] and name:
                    try:
                        connection.execute(text(f"ALTER TABLE resources DROP INDEX {name}"))
                    except SQLAlchemyError:
                        pass

    if "bookings" in table_names:
        booking_columns = {column["name"] for column in inspector.get_columns("bookings")}
        with engine.begin() as connection:
            if "name" not in booking_columns:
                connection.execute(text("ALTER TABLE bookings ADD COLUMN name VARCHAR(120) NULL"))
            if "department" not in booking_columns:
                connection.execute(text("ALTER TABLE bookings ADD COLUMN department VARCHAR(120) NULL"))
            if "updated_at" not in booking_columns:
                connection.execute(text("ALTER TABLE bookings ADD COLUMN updated_at DATETIME NULL"))
            if "decision_at" not in booking_columns:
                connection.execute(text("ALTER TABLE bookings ADD COLUMN decision_at DATETIME NULL"))
            if "block_id" in booking_columns:
                try:
                    connection.execute(text("ALTER TABLE bookings MODIFY COLUMN block_id INTEGER NULL"))
                except SQLAlchemyError:
                    pass

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    index_specs = [
        ("resources", "ix_resources_block_id", "block_id"),
        ("bookings", "ix_bookings_block_id", "block_id"),
        ("bookings", "ix_bookings_resource_id", "resource_id"),
        ("bookings", "ix_bookings_user_id", "user_id"),
        ("bookings", "ix_bookings_booking_date", "booking_date"),
        ("bookings", "ix_bookings_status", "status"),
    ]

    with engine.begin() as connection:
        for table_name, index_name, column_name in index_specs:
            if table_name not in inspector.get_table_names():
                continue
            column_names = {column["name"] for column in inspector.get_columns(table_name)}
            existing_indexes = {index["name"] for index in inspector.get_indexes(table_name)}
            if column_name in column_names and index_name not in existing_indexes:
                try:
                    connection.execute(text(f"CREATE INDEX {index_name} ON {table_name} ({column_name})"))
                except SQLAlchemyError:
                    pass

        user_indexes = {index["name"] for index in inspector.get_indexes("users")} if "users" in inspector.get_table_names() else set()
        user_columns = {column["name"] for column in inspector.get_columns("users")} if "users" in inspector.get_table_names() else set()
        for index_name, column_name in [("ix_users_uid", "uid"), ("ix_users_email", "email")]:
            if column_name in user_columns and index_name not in user_indexes:
                try:
                    connection.execute(text(f"CREATE UNIQUE INDEX {index_name} ON users ({column_name})"))
                except SQLAlchemyError:
                    pass


def seed_blocks(db) -> dict[str, int]:
    existing_blocks = {item.name: item for item in db.query(block.Block).all()}
    for block_name in BLOCK_RESOURCE_DATA:
        if block_name not in existing_blocks:
            db.add(block.Block(name=block_name))
    db.commit()
    return {item.name: item.id for item in db.query(block.Block).all()}


def seed_admins(db, blocks_by_name: dict[str, int]) -> None:
    for block_name, block_id in blocks_by_name.items():
        if block_name not in BLOCK_RESOURCE_DATA:
            continue

        username = f"admin_{block_name}"
        existing_admin = db.query(user.User).filter(user.User.username == username).first()
        if existing_admin:
            existing_admin.role = "admin"
            existing_admin.block_id = block_id
            continue

        db.add(
            user.User(
                username=username,
                password=get_password_hash("123456"),
                role="admin",
                block_id=block_id,
            )
        )
    db.commit()


def seed_resources(db, blocks_by_name: dict[str, int]) -> None:
    for block_name, items in BLOCK_RESOURCE_DATA.items():
        for item in items:
            existing = (
                db.query(resource.Resource)
                .filter(
                    resource.Resource.name == item["name"],
                    resource.Resource.block_id == blocks_by_name[block_name],
                    resource.Resource.floor == item.get("floor"),
                )
                .first()
            )
            if existing:
                existing.type = item["type"]
                existing.description = item.get("description")
                existing.is_extra_center = False
            else:
                db.add(
                    resource.Resource(
                        name=item["name"],
                        type=item["type"],
                        block_id=blocks_by_name[block_name],
                        floor=item.get("floor"),
                        description=item.get("description"),
                        is_extra_center=False,
                    )
                )

    for item in EXTRA_CENTERS:
        existing = (
            db.query(resource.Resource)
            .filter(
                resource.Resource.name == item["name"],
                resource.Resource.block_id.is_(None),
                resource.Resource.floor == item.get("floor"),
            )
            .first()
        )
        if existing:
            existing.type = item["type"]
            existing.description = item.get("description")
            existing.is_extra_center = True
        else:
            db.add(
                resource.Resource(
                    name=item["name"],
                    type=item["type"],
                    block_id=None,
                    floor=item.get("floor"),
                    description=item.get("description"),
                    is_extra_center=True,
                )
            )
    db.commit()


def seed_incharges(db, blocks_by_name: dict[str, int]) -> None:
    db.query(incharge.Incharge).delete()
    db.commit()

    for item in INCHARGE_DATA:
        block_label = item["block_name"]
        block_key = block_label.replace(" Block", "") if block_label.endswith(" Block") else None
        db.add(
            incharge.Incharge(
                name=item["name"],
                contact=item.get("contact"),
                block_name=block_label,
                resource_name=item.get("resource_name"),
                block_id=blocks_by_name.get(block_key) if block_key else None,
            )
        )
    db.commit()


app = FastAPI(title="Campus Booking System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    run_startup_migrations()
    db = SessionLocal()
    try:
        blocks_by_name = seed_blocks(db)
        seed_admins(db, blocks_by_name)
        seed_resources(db, blocks_by_name)
        seed_incharges(db, blocks_by_name)
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(client.router)
app.include_router(admin.router)
app.include_router(blocks.router)
app.include_router(catalog.router)
app.include_router(incharges.router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Campus Booking System backend is running"}
