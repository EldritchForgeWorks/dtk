window.renderPreviewSection = function(container) {
  const iframe = el('iframe', {
    id: 'preview-iframe',
    style: { width: '100%', height: '700px', border: '1px solid #e0e0f0', borderRadius: '6px', background: '#fff' }
  })

  async function refresh() {
    iframe.srcdoc = '<p style="font-family:sans-serif;padding:20px;color:#888">Generating preview…</p>'
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: window.state })
      })
      const data = await res.json()
      if (data.error) { iframe.srcdoc = `<p style="color:red;padding:20px">${data.error}</p>`; return }
      iframe.srcdoc = data.html
    } catch (e) {
      iframe.srcdoc = `<p style="color:red;padding:20px">Preview error: ${e.message}</p>`
    }
  }

  const btn = el('button', { class: 'btn btn-secondary', onclick: refresh }, 'Refresh Preview')

  container.append(
    el('h2', { class: 'section-title' }, 'Compendium Preview'),
    el('p', { style: { color: '#888', marginBottom: '12px', fontSize: '13px' } },
      'This is exactly what players will see in the exported compendium.html file.'),
    el('div', { style: { marginBottom: '12px' } }, btn),
    iframe
  )

  refresh()
}
