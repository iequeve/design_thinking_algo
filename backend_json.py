# backend_json.py
import http.server
import socketserver
import json
import hashlib
import uuid
import os
from datetime import datetime
from typing import Optional, List, Dict
from urllib.parse import urlparse, parse_qs
from io import BytesIO
import random

# JSON storage utilities
DATA_DIR = os.path.abspath(os.path.dirname(__file__))
JSON_DB_PATH = os.path.join(DATA_DIR, "submissions.json")
JSON_DEMO_DB_PATH = os.path.join(DATA_DIR, "demo_submissions.json")

def load_json_db(demo: bool = False):
    path = JSON_DEMO_DB_PATH if demo else JSON_DB_PATH
    if not os.path.exists(path):
        return []
