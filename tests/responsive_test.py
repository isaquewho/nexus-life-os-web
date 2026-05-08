import sys
import io

# Set stdout to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

def run_responsive_test():
    with sync_playwright() as p:
        print("🚀 Starting Nexus Life OS Responsive Test...")
        browser = p.chromium.launch(headless=True)
        
        # Mobile Device Emulation (iPhone 13)
        device = p.devices['iPhone 13']
        context = browser.new_context(**device)
        page = context.new_page()
        
        base_url = 'http://localhost:3000'
        
        print("\n📱 Testing Login Page on Mobile...")
        page.goto(f"{base_url}/pt-BR/login")
        page.wait_for_load_state('networkidle')
        
        # Check if logo is centered and visible
        is_logo_visible = page.locator('h1:has-text("NEXUS")').is_visible()
        print(f"  Logo visible: {is_logo_visible}")
        
        # Check if glass card is responsive
        card_width = page.evaluate("() => document.querySelector('.glass').offsetWidth")
        viewport_width = device['viewport']['width']
        print(f"  Card width: {card_width}px (Viewport: {viewport_width}px)")
        
        if card_width <= viewport_width:
            print("✅ Success: Glass card fits within mobile viewport.")
        else:
            print("❌ Failure: Glass card is overflowing!")

        page.screenshot(path='tests/login_mobile.png')
        print(f"  Mobile screenshot saved to tests/login_mobile.png")
        
        print("\n🏁 Responsive Test Completed.")
        browser.close()

if __name__ == '__main__':
    run_responsive_test()
