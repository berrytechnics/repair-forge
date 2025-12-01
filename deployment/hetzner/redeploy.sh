#! /bin/bash

cd ~/circuit-sage

git pull

echo "\n Pulled latest code \n"

cd /opt/circuit-sage

cp -r ~/circuit-sage/ ./

echo "\n Copied code to /opt/circuit-sage \n"

./deployment/hetzner/deploy.sh