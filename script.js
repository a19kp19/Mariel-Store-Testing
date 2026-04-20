const supabaseUrl = "https://iqkjkteojcgnzivhhwqx.supabase.co";
const supabaseKey = "sb_publishable_YbDZQCCV_1Yk8KQPJuuQ1w_TkXhkLbC";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
/* =========================
   HELPERS
========================= */
function setText(id, message) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = message;
  }
}

function goTo(path, delay = 1500) {
  setTimeout(() => {
    window.location.href = path;
  }, delay);
}

function isStrongPassword(password) {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

function updatePasswordState() {
  const passwordInput = document.getElementById("password");
  const passwordHint = document.getElementById("password-hint");

  if (!passwordInput || !passwordHint) {
    return;
  }

  const password = passwordInput.value;

  if (password === "") {
    passwordInput.style.borderColor = "";
    passwordHint.textContent = "Password should contain uppercase, lowercase, number, and special character.";
    passwordHint.style.color = "";
    return;
  }

  if (isStrongPassword(password)) {
    passwordInput.style.borderColor = "";
    passwordHint.textContent = "Password is strong.";
    passwordHint.style.color = "green";
  } else {
    passwordInput.style.borderColor = "red";
    passwordHint.textContent = "Password should contain uppercase, lowercase, number, and special character.";
    passwordHint.style.color = "red";
  }
}

/* =========================
   REGISTER
========================= */
const registerForm = document.getElementById("register-form");
const passwordInput = document.getElementById("password");

if (passwordInput) {
  passwordInput.addEventListener("input", updatePasswordState);
}

if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const fullName = document.getElementById("full-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    setText("form-message", "");

    if (!fullName || !email || !password || !confirmPassword) {
      setText("form-message", "Please fill in all fields.");
      return;
    }

    if (!isStrongPassword(password)) {
      document.getElementById("password").style.borderColor = "red";
      setText("form-message", "Password is too weak.");
      return;
    }

    if (password !== confirmPassword) {
      setText("form-message", "Passwords do not match.");
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      setText("form-message", error.message);
      return;
    }

    registerForm.reset();
    updatePasswordState();

    if (data.session) {
      setText("form-message", "Registered successfully. Redirecting...");
      goTo("../index.html");
    } else {
      setText("form-message", "Registered successfully. Check your email to verify your account.");
    }
  });
}

/* =========================
   LOGIN WITH EMAIL/PASSWORD
========================= */
const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    setText("login-message", "");

    if (!email || !password) {
      setText("login-message", "Please enter your email and password.");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      setText("login-message", error.message);
      return;
    }

    setText("login-message", "Login successful. Redirecting...");
    goTo("../index.html");
  });
}

/* =========================
   LOGIN WITH GOOGLE
========================= */
const googleLoginButton = document.getElementById("google-login");

if (googleLoginButton) {
  googleLoginButton.addEventListener("click", async function () {
    setText("login-message", "");

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/pages/login.html"
      }
    });

    if (error) {
      setText("login-message", error.message);
    }
  });
}

/* =========================
   SHOW / HIDE PHONE LOGIN
========================= */
const showPhoneLoginButton = document.getElementById("show-phone-login");
const phoneLoginBox = document.getElementById("phone-login-box");

if (showPhoneLoginButton && phoneLoginBox) {
  showPhoneLoginButton.addEventListener("click", function () {
    phoneLoginBox.classList.toggle("hidden");
  });
}

/* =========================
   PHONE OTP - SEND CODE
========================= */
const sendPhoneCodeButton = document.getElementById("send-phone-code");

if (sendPhoneCodeButton) {
  sendPhoneCodeButton.addEventListener("click", async function () {
    const phone = document.getElementById("phone-number").value.trim();

    setText("phone-message", "");

    if (!phone) {
      setText("phone-message", "Please enter your phone number.");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
      phone: phone
    });

    if (error) {
      setText("phone-message", error.message);
      return;
    }

    setText("phone-message", "OTP sent. Check your phone.");
  });
}

/* =========================
   PHONE OTP - VERIFY CODE
========================= */
const verifyPhoneCodeButton = document.getElementById("verify-phone-code");

if (verifyPhoneCodeButton) {
  verifyPhoneCodeButton.addEventListener("click", async function () {
    const phone = document.getElementById("phone-number").value.trim();
    const code = document.getElementById("phone-code").value.trim();

    setText("phone-message", "");

    if (!phone || !code) {
      setText("phone-message", "Please enter your phone number and OTP.");
      return;
    }

    const { error } = await supabaseClient.auth.verifyOtp({
      phone: phone,
      token: code,
      type: "sms"
    });

    if (error) {
      setText("phone-message", error.message);
      return;
    }

    setText("phone-message", "Phone login successful. Redirecting...");
    goTo("../index.html");
  });
}

/* =========================
   CHECK CURRENT SESSION
========================= */
async function checkCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    return;
  }

  const currentPath = window.location.pathname;

  if (
    data.session &&
    (currentPath.endsWith("/pages/login.html") || currentPath.endsWith("/pages/register.html"))
  ) {
    window.location.href = "../index.html";
  }
}

checkCurrentSession();

async function updateNavAuthState() {
  const registerLink = document.getElementById("register-link");
  const loginLink = document.getElementById("login-link");
  const logoutLink = document.getElementById("logout-link");
  const logoutButton = document.getElementById("logout-btn");

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    return;
  }

  if (data.session) {
    if (registerLink) {
      registerLink.classList.add("hidden");
    }

    if (loginLink) {
      loginLink.classList.add("hidden");
    }

    if (logoutLink) {
      logoutLink.classList.remove("hidden");
    }
  } else {
    if (registerLink) {
      registerLink.classList.remove("hidden");
    }

    if (loginLink) {
      loginLink.classList.remove("hidden");
    }

    if (logoutLink) {
      logoutLink.classList.add("hidden");
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async function (event) {
      event.preventDefault();

      const { error } = await supabaseClient.auth.signOut();

      if (!error) {
        if (window.location.pathname.includes("/pages/")) {
          window.location.href = "../index.html";
        } else {
          window.location.href = "index.html";
        }
      }
    });
  }
}

updateNavAuthState();