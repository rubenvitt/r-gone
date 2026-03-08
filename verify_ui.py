from playwright.sync_api import Page, expect, sync_playwright
import time

def test_features(page: Page):
    # 1. Arrange: Go to the homepage.
    print("Navigating to homepage...")
    page.goto("http://localhost:3000")

    # Wait for page to load
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Check if we are on setup page
    if page.get_by_text("Setup Security").is_visible():
        print("On Setup Security page. Setting up...")
        page.get_by_placeholder("Create a strong passphrase").fill("password123")
        page.get_by_placeholder("A hint to help you remember your passphrase").fill("hint")
        page.get_by_role("button", name="Setup Passphrase").click()
        # Wait for navigation
        page.wait_for_load_state("networkidle")
        time.sleep(5) # Wait for redirect

    # Check if we are on login page
    if page.get_by_text("Secure Access").is_visible():
        print("On Login page. Logging in...")
        page.get_by_placeholder("Enter your passphrase").fill("password123")
        page.get_by_role("button", name="Unlock").click()
        # Wait for navigation
        page.wait_for_load_state("networkidle")
        time.sleep(5)

        # Check if still on login page
        if page.get_by_text("Secure Access").is_visible():
             print("Still on login page. Trying to click unlock again...")
             page.get_by_role("button", name="Unlock").click()
             time.sleep(5)

    # Take homepage screenshot
    print("Taking homepage screenshot...")
    page.screenshot(path="/home/jules/verification/homepage.png")

    # Check if we are on dashboard (look for Dashboard text or navigation)
    if not page.get_by_text("Dashboard").first.is_visible():
        print("Not on dashboard. Verification stopped.")
        return

    # 2. Emergency Access Verification
    print("Navigating to Emergency Access...")
    emergency_button = page.get_by_role("button", name="Emergency Access")
    emergency_button.click()

    # Wait for TokenManager to appear (it's inside Emergency Access tab)
    # TokenManager has text "Access Token Management"
    expect(page.get_by_text("Access Token Management")).to_be_visible(timeout=10000)

    # Click Access Tokens tab to ensure it is visible
    # In EmergencyAccessManager, tabs are: "Emergency Contacts", "Access Tokens", "Access Logs"
    page.get_by_role("button", name="Access Tokens").click()
    time.sleep(1) # Animation wait

    print("Taking Emergency Access screenshot...")
    page.screenshot(path="/home/jules/verification/emergency-access.png")

    # 3. Messages Verification
    print("Navigating to Messages...")
    messages_button = page.get_by_role("button", name="Messages")
    messages_button.click()

    # Wait for Messages Library to load
    expect(page.get_by_text("Messages Library")).to_be_visible(timeout=10000)

    print("Taking Messages Library screenshot...")
    page.screenshot(path="/home/jules/verification/messages.png")

    # 4. Message Composer (RecipientManager) Verification
    print("Opening Message Composer...")
    # Button might be "New Message" with icon
    new_message_button = page.get_by_role("button", name="New Message")
    new_message_button.click()

    # Wait for composer
    expect(page.get_by_text("New Message", exact=False)).to_be_visible(timeout=10000)

    # Check for RecipientManager presence (e.g. "Message Recipients")
    expect(page.get_by_text("Message Recipients")).to_be_visible(timeout=10000)

    print("Taking Message Composer screenshot...")
    page.screenshot(path="/home/jules/verification/message-composer.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_features(page)
            print("Verification complete!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
