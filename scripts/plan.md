 # Create the appuser
  useradd -m -s /bin/bash appuser

  # Verify it was created
  ls /home/
  # Should show 'appuser'

  # Create the app directory
  mkdir -p /home/appuser/app
  cd /home/appuser

  # Clone the repository
  git clone https://github.com/mitchellmoss/hubdownloader.git app
  cd app

  # Set proper ownership
  chown -R appuser:appuser /home/appuser

  # Set Chrome path for Puppeteer
  echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable' >> /etc/environment

  # Switch to appuser
  su - appuser

  # Navigate to app directory
  cd ~/app

  # Install dependencies
  npm install

  # Copy environment file
  cp .env.example .env

  # Build the application
  npm run build

  # Initialize database
  npx prisma migrate deploy

  # Start the application
  pm2 start npm --name lyricless -- start
  pm2 save
  pm2 startup

  # The last command will show you a command to run as root - exit and run it
  exit

  # Run the command that pm2 startup showed you (it will look something like):
  # env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u appuser --hp /home/appuser

  After this, your application should be running. Check with:

  # As appuser
  su - appuser
  pm2 list
  pm2 logs

  # Check if app is accessible
  curl http://localhost:3000

  To access from outside the container, get the container IP:
  ip addr show eth0 | grep inet

  Then access http://CONTAINER_IP:3000 from your browser.
