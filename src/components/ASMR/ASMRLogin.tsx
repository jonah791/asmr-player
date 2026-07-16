import React, { useState, useCallback } from 'react'
import type { ASMRConfig } from '../../types'

interface Props {
  onLogin: (config: ASMRConfig) => Promise<{ success: boolean; error?: string }>
}

export function ASMRLogin({ onLogin }: Props) {
  const [serverUrl, setServerUrl] = useState('https://api.asmr-200.com')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOfficial, setIsOfficial] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  const handleGuestLogin = useCallback(async () => {
    setGuestLoading(true)
    setError('')
    const result = await onLogin({
      serverUrl: serverUrl.replace(/\/+$/, ''),
      token: '',
      isOfficial,
      guestMode: true
    })
    setGuestLoading(false)
    if (!result.success) setError(result.error || '游客登录失败')
  }, [serverUrl, isOfficial, onLogin])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serverUrl.trim()) { setError('请输入服务器地址'); return }
    if (!username.trim() || !password) { setError('请输入用户名和密码'); return }
    setLoading(true)
    setError('')
    const result = await onLogin({
      serverUrl: serverUrl.replace(/\/+$/, ''),
      token: password,
      username: username.trim(),
      isOfficial
    })
    setLoading(false)
    if (!result.success) setError(result.error || '登录失败')
  }, [serverUrl, username, password, isOfficial, onLogin])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ width: 32, height: 32, color: 'var(--accent)' }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9 8v8l7-4-7-4z" />
        </svg>
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
          ASMR.one
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
          浏览、搜索和下载 ASMR 音声资源
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* 服务器地址 */}
        <div style={inputGroupStyle}>
          <label style={labelStyle}>服务器地址</label>
          <input style={inputStyle} value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="https://asmr.one" />
        </div>

        <div style={checkboxRowStyle}>
          <label style={{ ...labelStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <input type="checkbox" checked={isOfficial}
              onChange={e => setIsOfficial(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            官方服务器 (asmr.one)
          </label>
        </div>

        {/* 游客访问 */}
        <button onClick={handleGuestLogin} disabled={guestLoading}
          style={guestBtnStyle}>
          {guestLoading ? '连接中…' : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ width: 16, height: 16, flexShrink: 0 }}>
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 10-16 0" />
              </svg>
              游客访问 — 无需账号
            </>
          )}
        </button>

        {/* 分隔线 */}
        <div style={dividerStyle}>
          <span style={dividerTextStyle}>或者</span>
        </div>

        {/* 账号登录折叠区 */}
        <button onClick={() => setShowLogin(!showLogin)}
          style={toggleBtnStyle}>
          {showLogin ? '收起登录表单' : '使用账号密码登录'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{
              width: 12, height: 12, transition: 'transform 0.2s',
              transform: showLogin ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showLogin && (
          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>用户名</label>
              <input style={inputStyle} value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名或邮箱" autoComplete="username" />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>密码</label>
              <input style={inputStyle} type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码" autoComplete="current-password" />
            </div>

            {error && <div style={errorStyle}>{error}</div>}

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </button>
          </form>
        )}

        {!showLogin && error && <div style={errorStyle}>{error}</div>}
      </div>

      <div style={hintStyle}>
        游客模式可浏览和搜索，部分功能可能需登录账号。
        自建 Kikoeru 服务器请取消勾选「官方服务器」。
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%',
  padding: 'var(--space-xl)', overflow: 'auto',
  animation: 'fade-up 0.25s ease-out',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)',
  paddingTop: 'var(--space-lg)',
}
const inputGroupStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)',
}
const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500,
}
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm) var(--space-md)',
  fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
  outline: 'none', transition: 'border-color var(--transition-fast)',
}
const checkboxRowStyle: React.CSSProperties = {
  marginTop: 'var(--space-2xs)',
}
const errorStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)', color: 'var(--red)',
  padding: 'var(--space-sm)', background: 'rgba(248,113,113,0.1)',
  borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.5,
}

const guestBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 'var(--space-sm)',
  background: 'linear-gradient(135deg, rgba(155,109,255,0.15), rgba(196,132,252,0.08))',
  border: '1px solid rgba(155,109,255,0.25)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-md)',
  fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--accent)',
  cursor: 'pointer', transition: 'all var(--transition-fast)',
  width: '100%',
}

const dividerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
  margin: 'var(--space-xs) 0',
}
const dividerTextStyle: React.CSSProperties = {
  fontSize: 'var(--text-2xs)', color: 'var(--text-dim)',
  whiteSpace: 'nowrap',
  padding: '0 var(--space-sm)',
  background: 'var(--bg-primary)',
  position: 'relative', zIndex: 1,
}

const toggleBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 'var(--space-xs)',
  background: 'transparent', border: 'none',
  fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
  cursor: 'pointer', padding: 'var(--space-xs)',
  width: '100%',
}

const formStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
}
const buttonStyle: React.CSSProperties = {
  background: 'var(--gradient-accent)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm) var(--space-lg)',
  fontSize: 'var(--text-sm)', fontWeight: 600, color: '#fff',
  cursor: 'pointer', transition: 'opacity var(--transition-fast)',
  marginTop: 'var(--space-sm)',
}
const hintStyle: React.CSSProperties = {
  fontSize: 'var(--text-2xs)', color: 'var(--text-dim)',
  textAlign: 'center', marginTop: 'var(--space-xl)',
  lineHeight: 1.5,
}
