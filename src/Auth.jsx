import { useState } from 'react'
import { supabase } from './supabaseClient'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isLogin) {
      // login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      }
    } else {
      // register
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email for the confirmation link!')
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <h1>Housekeeping Tracker</h1>
      <div className="auth-card">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-card">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="field-card">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength="6"
              required
            />
          </div>
          <button className="calc-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setIsLogin(!isLogin); setMessage('') }}>
            {isLogin ? 'Register' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default Auth