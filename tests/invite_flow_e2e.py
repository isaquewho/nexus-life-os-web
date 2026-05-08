import sys
import io
import uuid
import json

# Set stdout to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

def run_invite_e2e():
    test_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    test_email = f"test-{uuid.uuid4().hex[:6]}@nexus-test.com"
    
    print(f"🚀 Starting E2E Invite Flow Test...")
    print(f"  Test Code: {test_code}")
    print(f"  Test Email: {test_email}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        base_url = 'http://localhost:3000'

        # 1. SETUP: We'll assume the SQL was run manually or we use the MCP
        # For this script, we expect the code to be valid.
        
        print("\n🌐 Navigating to Login Page...")
        page.goto(f"{base_url}/pt-BR/login")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000) # Hydration delay

        # 2. Open Invite Form
        print("🖱️ Clicking 'Tenho um convite'...")
        page.click('button:has-text("convite")')
        
        # 3. Fill Form
        print("✍️ Filling invite details...")
        page.fill('input[id="invite-email"]', test_email)
        page.fill('input[id="invite-code"]', "NEXUS-BETA-TEST") # Using the one I created
        
        # Take screenshot of the form
        page.screenshot(path='tests/invite_form_filled.png')

        print("🔘 Submitting invite...")
        page.click('button:has-text("Validar")')

        # Wait for the success message and password field
        print("⏳ Waiting for password setup screen...")
        try:
            # The success message from RPC is usually "Convite validado!"
            page.wait_for_selector('p:has-text("validado")', timeout=15000)
            print("✅ Step 1: Invite validated.")
            
            # Now wait for the password input to appear
            page.wait_for_selector('input[id="signup-password"]', timeout=5000)
            print("✍️ Setting password...")
            page.fill('input[id="signup-password"]', "TestPassword123!")
            
            page.screenshot(path='tests/invite_step2_password.png')
            
            print("🔘 Finalizing registration...")
            page.click('button:has-text("Finalizar")')
            
            # Wait for final success or redirect
            page.wait_for_selector('p:has-text("concluído")', timeout=15000)
            print("✅ Step 2: Signup complete!")
            
        except Exception as e:
            error_selector = 'p.text-expense'
            if page.is_visible(error_selector):
                error_text = page.inner_text(error_selector)
                print(f"❌ Failure: Error - {error_text}")
            else:
                print(f"❌ Failure: Timeout or error - {str(e)}")

        page.screenshot(path='tests/invite_final_result.png')
        print("🏁 Full Flow Test Completed.")
        browser.close()

if __name__ == '__main__':
    run_invite_e2e()
