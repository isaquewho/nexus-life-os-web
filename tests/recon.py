import sys
import io

# Set stdout to UTF-8 to avoid UnicodeEncodeError on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        url = 'http://localhost:3000'
        print(f"Navigating to {url}...")
        try:
            page.goto(url)
            
            print("Waiting for networkidle...")
            page.wait_for_load_state('networkidle')
            
            print("Capturing screenshot...")
            screenshot_path = 'tests/recon_screenshot.png'
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")
            
            print("Extracting page content summary...")
            title = page.title()
            print(f"Page Title: {title}")
            
            # Check for specific elements
            content = page.content()
            if "Nexus Life OS" in content:
                print("Confirmed: 'Nexus Life OS' found in page content")
            else:
                print("Warning: 'Nexus Life OS' NOT found in page content")
                
            buttons = page.locator('button').all()
            print(f"Found {len(buttons)} buttons")
            for i, btn in enumerate(buttons[:10]):
                try:
                    text = btn.inner_text().strip()
                    print(f" Button {i+1}: {text}")
                except Exception as e:
                    print(f" Button {i+1}: (Error reading text: {e})")
        except Exception as e:
            print(f"Error during execution: {e}")
        finally:
            browser.close()

if __name__ == '__main__':
    run()
