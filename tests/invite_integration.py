import sys
import io
import time
import subprocess

# Set stdout to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

# Note: This script assumes the presence of environment variables or MCP tools 
# to interact with Supabase, but since it's running in a shell, 
# I will simulate the "Action" part and the user can see the result.

def run_integration_test():
    with sync_playwright() as p:
        print("🚀 Starting Nexus Life OS Invite Integration Test...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        base_url = 'http://localhost:3000'
        
        # Test Email (Added via MCP previously or assumed to be in DB for this test)
        authorized_email = "nexus-test-bot@nexus.com"
        
        print(f"\n🧪 Test: Verified Email (Simulating Authorized Access)")
        page.goto(f"{base_url}/pt-BR/login")
        page.wait_for_load_state('networkidle')
        
        print(f"Entering authorized email: {authorized_email}")
        page.fill('#login-email', authorized_email)
        page.fill('#login-password', 'correct-password-123')
        
        print("Clicking 'Entrar'...")
        page.click('button:has-text("Entrar")')
        
        # Wait to see if error message appears
        error_msg_selector = 'p:has-text("Seu e-mail não tem acesso ao Nexus")'
        try:
            # We expect it NOT to find this error if the email is in the allowlist
            page.wait_for_selector(error_msg_selector, timeout=3000)
            print("❌ Failure: Allowlist REJECTED a should-be-authorized email.")
        except:
            print("✅ Success: No allowlist rejection for the authorized email.")
            # Note: It might still fail auth later (invalid credentials), 
            # but the allowlist check passed!
            
            # Check for credential error instead of allowlist error
            try:
                page.wait_for_selector('p:has-text("E-mail ou senha incorretos")', timeout=3000)
                print("✅ Info: Allowlist check PASSED (proceeded to credential check).")
            except:
                print("⚠️ Note: Neither allowlist error nor credential error found. Check screenshot.")

        page.screenshot(path='tests/integration_result.png')
        print("\n🏁 Integration Test Completed.")
        browser.close()

if __name__ == '__main__':
    run_integration_test()
