#!/bin/bash

echo "===> Begin setup SSH and GPG..."

if [ -d /root/tmp/.ssh ]; then
  echo "Detected SSH keys, configuring..."
  mkdir -p /root/.ssh
  cp -r /root/tmp/.ssh/* /root/.ssh/
  chmod 700 /root/.ssh
  chmod 600 /root/.ssh/*
  echo "SSH keys setup completed"
else
  echo "No SSH keys detected, skipping SSH setup"
fi

if [ -d /root/tmp/.gnupg ]; then
  echo "Detected GPG keys, configuring..."
  mkdir -p /root/.gnupg
  cp -r /root/tmp/.gnupg/* /root/.gnupg/
  chmod 700 /root/.gnupg
  chmod 600 /root/.gnupg/*
  echo "GPG keys setup completed"
else
  echo "No GPG keys detected, skipping GPG setup"
fi

echo "===> SSH and GPG setup completed!"