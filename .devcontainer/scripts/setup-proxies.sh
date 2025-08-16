#!/bin/bash

setup_proxy() {
    local local_port=$1
    local target_host=$2
    local target_port=$3
    local service_name=$4
    
    socat TCP-LISTEN:${local_port},fork TCP:${target_host}:${target_port} &
    echo "Set proxy: localhost:${local_port} -> ${target_host}:${target_port} (${service_name})"
}

# MySQL
setup_proxy 3306 mysql 3306 "MySQL"

echo "🎉 All proxy services started!"