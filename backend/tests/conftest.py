import os
import pytest
import uuid
import random
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("JWT_SECRET", "test-secret")

from app.main import app, _rate_limit_store
from app.database import Base, get_db


def _generar_rnc_valido() -> str:
    base = "".join([str(random.randint(0, 9)) for _ in range(8)])
    pesos = [7, 9, 8, 6, 5, 4, 3, 2]
    suma = sum(int(base[i]) * pesos[i] for i in range(8))
    digito = (10 - (suma % 10)) % 10
    return base + str(digito)

TEST_DB_URL = "sqlite://"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    _rate_limit_store.clear()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_user_data():
    return {
        "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
        "password": "TestPass123!",
        "name": "Test User",
        "empresa_rnc": _generar_rnc_valido(),
        "empresa_nombre": "Test Empresa SRL",
    }


@pytest.fixture
def auth_headers(client, test_user_data):
    response = client.post("/api/auth/register", json=test_user_data)
    assert response.status_code == 201
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_client(client, auth_headers):
    client.headers.update(auth_headers)
    return client
