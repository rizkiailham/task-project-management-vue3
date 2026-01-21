const defaultContentHtml = `
  <div class="is-section is-section-100 is-shadow-1 is-bg-grey">
    <div class="is-boxes">
      <div
        class="is-box-img is-box is-box-6"
        style="background-color: rgb(247, 247, 247); background-image: linear-gradient(0deg, rgb(255, 208, 100), rgb(239, 98, 159));"
      >
        <div class="is-boxes">
          <div class="is-overlay">
            <div
              class="is-overlay-bg"
              style="background-image: url(&quot;/uploads/travel.png&quot;); background-position: 50% 60%; transform: translateY(-0.0631912px) scale(1.05);"
              data-bottom-top="transform:translateY(-120px) scale(1.05)"
              data-top-bottom="transform:translateY(120px) scale(1.05)"
            ></div>
          </div>
        </div>
      </div>
      <div class="is-box is-dark-text is-bg-light is-box-6">
        <div class="is-boxes">
          <div class="is-box-centered">
            <div class="is-container container" style="max-width: 480px;">
              <div class="row clearfix">
                <div class="column full right">
                  <div class="display">
                    <h1 class="size-72">Your Learning Journey</h1>
                  </div>
                  <p style="border-bottom: 3px solid #333; width: 80px; display: inline-block;"></p>
                </div>
              </div>
              <div class="row clearfix">
                <div class="column full">
                  <div class="spacer height-40"></div>
                </div>
              </div>
              <div class="row clearfix">
                <div class="column full">
                  <p style="text-align: justify;">
                    Explore our comprehensive learning platform designed to help you achieve your educational goals.
                    Our platform has been empowering students and educators since its launch, providing interactive
                    courses and personalized learning paths to help you succeed in your educational journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`

function isBaseTypeStyle(node) {
  if (node.tagName !== 'LINK') return false;
  const href = node.getAttribute('href') || '';
  return href.includes('basetype-')
}

function isSectionStyle(node) {
  const dataName = node.getAttribute('data-name') || '';
  const href = node.getAttribute('href') || '';
  return dataName === 'contentstyle' || href.includes('type-')
}

export function splitContentHtml(contentHtml) {
  if (!contentHtml) {
    return {
      html: defaultContentHtml.trim(),
      mainCss: '',
      sectionCss: ''
    }
  }

  const container = document.createElement('div')
  container.innerHTML = contentHtml

  const mainCssParts = []
  const sectionCssParts = []

  const nodes = Array.from(container.querySelectorAll('link, style'))
  nodes.forEach((node) => {
    if (isBaseTypeStyle(node)) {
      mainCssParts.push(node.outerHTML)
      node.remove()
      return
    }
    if (isSectionStyle(node)) {
      sectionCssParts.push(node.outerHTML)
      node.remove()
    }
  })

  const html = container.innerHTML.trim() || defaultContentHtml.trim()
  return {
    html,
    mainCss: mainCssParts.join(''),
    sectionCss: sectionCssParts.join('')
  }
}

export function mergeContentHtml(html, mainCss, sectionCss) {
  const safeHtml = html || ''
  const safeMain = mainCss || ''
  const safeSection = sectionCss || ''
  return `${safeMain}${safeSection}${safeHtml}`
}

export { defaultContentHtml }
