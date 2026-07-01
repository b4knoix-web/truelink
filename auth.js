const SUPABASE_URL = 'https://vfolauskglbihqmlyqlt.supabase.co'
const SUPABASE_KEY = ''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmb2xhdXNrZ2xiaWhxbWx5cWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjU1NjgsImV4cCI6MjA5ODIwMTU2OH0.vXF77v3dCDjHFAhF7bBXxPEQ2tY6h8JNdJDmbuEiIHI''
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

async function initAuth() {
    const { data: { user } } = await db.auth.getUser()

    if (user) {
        const meta = user.user_metadata
        const name = (meta.first_name || '') + ' ' + (meta.last_name || '')
        const tlID = meta.truelink_id || ''

        // NAV BAR — hide Home + Sign Up, show user name + logout
        const navRight = document.getElementById('navRight')
        if (navRight) {
            navRight.innerHTML = `
                <span style="color:white; font-size:12px;">👤 ${name.trim()}</span>
                <a href="dashboard.html" style="padding:5px 14px; background:white; color:#1877f2; border:none; border-radius:3px; font-size:12px; font-weight:bold; text-decoration:none;">My Dashboard</a>
                <button onclick="logoutUser()" style="padding:5px 14px; background:#cc0000; color:white; border:none; border-radius:3px; font-size:12px; font-weight:bold; cursor:pointer;">Log Out</button>
            `
        }

        // NAV LINKS BAR — hide Home + Sign Up
        document.querySelectorAll('.nav-links-bar a').forEach(link => {
            const href = link.getAttribute('href')
            if (href === 'index.html' || href === 'signup.html') {
                link.style.display = 'none'
            }
        })

        // SIDEBAR — hide Home + Create My ID + Sign Up links
        document.querySelectorAll('.side-box-body a, .sidebar a').forEach(link => {
            const href = link.getAttribute('href')
            if (href === 'index.html' || href === 'signup.html') {
                link.style.display = 'none'
            }
        })

        // FOOTER — hide Home + Sign Up
        document.querySelectorAll('footer a').forEach(link => {
            const href = link.getAttribute('href')
            if (href === 'index.html' || href === 'signup.html') {
                link.style.display = 'none'
            }
        })

    } else {
        // NOT LOGGED IN — hide Dashboard link
        document.querySelectorAll('.nav-links-bar a').forEach(link => {
            if (link.getAttribute('href') === 'dashboard.html') {
                link.style.display = 'none'
            }
        })
    }
}

async function logoutUser() {
    await db.auth.signOut()
    window.location.href = 'index.html'
}

// Auto run on page load
document.addEventListener('DOMContentLoaded', initAuth)