import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app, _rate_limit_store
from app.database import Base, get_db
from app.utils import pwd_context

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
        "empresa_rnc": f"{uuid.uuid4().hex[:9]}",
        "empresa_nombre": "Test Empresa SRL",
    }


@pytest.fixture
def auth_headers(client, test_user_data):
    response = client.post("/api/auth/register", json=test_user_data)
    assert response.status_code == 200
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_client(client, auth_headers):
    client.headers.update(auth_headers)
    return client
