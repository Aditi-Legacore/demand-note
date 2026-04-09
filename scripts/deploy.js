const path = require('path');
const simpleGit = require('simple-git');
const puppeteer = require('puppeteer');

const COOLIFY_URL =
  process.env.COOLIFY_URL ||
  'http://143.244.141.58:8000/project/y12w292w7wawz1th7z6ohxwy/environment/f4uw2tblimbnddo2o0cso7f5/application/o62ncltahqt8wskyz44ylldh/deployment/vywpqs26s1tv0qjw5uwkfs1n';
const DEPLOY_SUCCESS_TIMEOUT = parseInt(process.env.COOLIFY_DEPLOY_TIMEOUT_MS, 10) || 180000;

const git = simpleGit({ baseDir: process.cwd() });

async function detectGitChanges() {
  const status = await git.status();
  const tracked = new Set();

  status.files.forEach((file) => tracked.add(file.path));

  ['not_added', 'created', 'deleted', 'modified', 'staged'].forEach((category) => {
    const entries = status[category];
    if (!entries) {
      return;
    }
    entries.forEach((entry) => {
      if (entry && typeof entry === 'string') {
        tracked.add(entry);
        return;
      }
      if (entry && entry.path) {
        tracked.add(entry.path);
      }
    });
  });

  (status.renamed || []).forEach((rename) => {
    if (rename.from) {
      tracked.add(rename.from);
    }
    if (rename.to) {
      tracked.add(rename.to);
    }
  });

  return Array.from(tracked).filter(Boolean);
}

function createCommitMessage(changedFiles) {
  const preview = changedFiles.slice(0, 4).map((file) => path.basename(file));
  const summary =
    changedFiles.length === 1 ? changedFiles[0] : changedFiles.length + ' files';
  let message = 'Auto deploy — ' + summary;

  if (preview.length) {
    message += ': ' + preview.join(', ');
  }

  return message.slice(0, 140);
}

async function commitAndPush(changedFiles) {
  if (!changedFiles.length) {
    console.log('No git changes detected. Skipping commit/push.');
    return false;
  }

  await git.add('.');
  const message = createCommitMessage(changedFiles);
  console.log('Committing changes with message:', message);
  await git.commit(message);
  await git.push();
  return true;
}

async function clickActionButton(page, keywords, timeout = 60000) {
  const normalized = keywords.map((keyword) => keyword.toLowerCase());

  const handle = await page.waitForFunction(
    (phrases) => {
      const nodes = Array.from(document.querySelectorAll('button, a'));
      return (
        nodes.find((node) => {
          const text = (node.textContent || '').toLowerCase();
          return phrases.some((phrase) => text.includes(phrase));
        }) || null
      );
    },
    { timeout },
    normalized
  );

  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    throw new Error('Could not resolve action element by text.');
  }

  await element.click();
  await element.dispose();
  await handle.dispose();
}

async function waitForDeploymentSuccess(page) {
  const successIndicators = [
    'deployment succeeded',
    'deployment success',
    'deployment finished',
    'deployment ready',
    'deployment complete',
    'status: succeeded',
  ];

  await page.waitForFunction(
    (indicators) => {
      const texts = Array.from(document.querySelectorAll('span, div, strong')).map((node) =>
        (node.textContent || '').toLowerCase()
      );
      return indicators.some((indicator) => texts.some((text) => text.includes(indicator)));
    },
    { timeout: DEPLOY_SUCCESS_TIMEOUT },
    successIndicators
  );
}

async function findDeployedProjectUrl(page) {
  const matchers = ['open project', 'open app', 'visit project', 'visit site', 'view site', 'open'];

  const href = await page.evaluate((phrases) => {
    const anchors = Array.from(document.querySelectorAll('a')).filter((anchor) => anchor.href);
    for (const anchor of anchors) {
      const text = (anchor.textContent || anchor.title || '').toLowerCase();
      if (phrases.some((phrase) => text.includes(phrase))) {
        return anchor.href;
      }
    }
    return null;
  }, matchers);

  if (href) {
    return href;
  }

  const fallback = await page.evaluate(() => {
    const buttonWithHref = Array.from(document.querySelectorAll('button[data-href], [data-url]')).find(
      (button) => button.getAttribute('data-href') || button.getAttribute('data-url')
    );
    return (
      buttonWithHref?.getAttribute('data-href') ||
      buttonWithHref?.getAttribute('data-url') ||
      null
    );
  });

  return fallback;
}

async function openDeployedProject(browser, page) {
  const deployedUrl = await findDeployedProjectUrl(page);
  if (!deployedUrl) {
    console.log('Could not locate a link to the deployed project on the Coolify page.');
    return;
  }

  console.log('Opening deployed project at ' + deployedUrl);
  const deployedTab = await browser.newPage();
  await deployedTab.goto(deployedUrl, { waitUntil: 'networkidle2' });
  await deployedTab.close();
}

async function redeployViaCoolify() {
  console.log('Launching browser to trigger Coolify redeploy.');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(COOLIFY_URL, { waitUntil: 'networkidle2' });
    console.log('Opened Coolify project page at ' + COOLIFY_URL);

    await clickActionButton(page, ['redeploy', 'deploy again', 'run deployment']);
    console.log('Requested redeploy on Coolify.');

    await waitForDeploymentSuccess(page);
    console.log('Deployment marked as successful by Coolify.');

    await openDeployedProject(browser, page);
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const changedFiles = await detectGitChanges();
    await commitAndPush(changedFiles);
    await redeployViaCoolify();
    console.log('Deployment automation completed.');
  } catch (error) {
    console.error('Deployment automation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
