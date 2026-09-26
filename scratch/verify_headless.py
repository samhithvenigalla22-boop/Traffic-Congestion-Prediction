import asyncio
import json
import subprocess
import urllib.request
import time

def check_vite():
    try:
        resp = urllib.request.urlopen("http://127.0.0.1:5173/", timeout=2)
        print("Vite HTTP Status:", resp.status)
        return True
    except Exception as e:
        print("Vite not reachable directly:", e)
        return False

if __name__ == "__main__":
    check_vite()
