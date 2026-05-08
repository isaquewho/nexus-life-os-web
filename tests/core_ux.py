import sys
import io
import time

# Set stdout to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        print("🚀 Starting Nexus Life OS Core Tests (v4)...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        # Capture console logs
        page.on("console", lambda msg: print(f"  [BROWSER CONSOLE] {msg.type}: {msg.text}"))
        
        base_url = 'http://localhost:3000'
        
        # Test 1: Allowlist Rejection
        print("\n🧪 Test 1: Allowlist Rejection")
        page.goto(f"{base_url}/pt-BR/login")
        page.wait_for_load_state('networkidle')
        
        test_email = "random-unauthorized@example.com"
        print(f"Entering unauthorized email: {test_email}")
        page.fill('#login-email', test_email)
        page.fill('#login-password', 'password123')
        
        print("Clicking 'Entrar'...")
        page.click('button:has-text("Entrar")')
        
        # Wait for error message
        error_msg_selector = 'p:has-text("Seu e-mail não tem acesso ao Nexus")'
        try:
            page.wait_for_selector(error_msg_selector, timeout=5000)
            print("✅ Success: Allowlist error message displayed correctly.")
        except:
            print("❌ Failure: Allowlist error message NOT found.")
            page.screenshot(path='tests/error_allowlist_failed.png')
            
        # Test 2: Protected Route Redirect (Corrected URL)
        print("\n🧪 Test 2: Protected Route Redirect")
        # Visiting the root locale which SHOULD be protected
        test_url = f"{base_url}/pt-BR"
        print(f"Attempting to access {test_url} directly...")
        page.goto(test_url)
        
        # Wait for either the redirect or a stable state
        try:
            # We expect a redirect to /login
            page.wait_for_url("**/login*", timeout=10000)
            print(f"✅ Success: Correctly redirected to {page.url}")
        except Exception as e:
            print(f"❌ Failure: Did not redirect to login within 10s. Current URL: {page.url}")
            
            # Diagnostic info
            content = page.content()
            print(f"  Page content length: {len(content)}")
            if "Carregando..." in content:
                print("  [DIAGNOSTIC] Page is showing 'Carregando...' (Stuck in Loading)")
            else:
                text_content = page.evaluate("() => document.body.innerText")
                print(f"  Visible text snippet: {text_content[:200].replace('\\n', ' ')}...")
            
            page.screenshot(path='tests/error_redirect_failed_v4.png')
            
        # Test 3: Public Route Accessibility (Reset Password)
        print("\n🧪 Test 3: Public Route Accessibility")
        print("Accessing /reset-password...")
        page.goto(f"{base_url}/pt-BR/reset-password")
        page.wait_for_load_state('networkidle')
        
        if page.locator('h1:has-text("NEXUS")').is_visible():
            print("✅ Success: Reset Password page is accessible.")
        else:
            print("❌ Failure: Reset Password page NOT loaded correctly.")

        print("\n🏁 Tests Completed.")
        browser.close()

if __name__ == '__main__':
    run_tests()
