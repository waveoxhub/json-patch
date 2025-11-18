FROM ubuntu:latest

# 更新包列表并安装基础工具
RUN apt-get update && apt-get install -y \
    curl \
    git \
    gnupg \
    lsb-release \
    sudo \
    wget \
    socat \
    apt-transport-https \
    ca-certificates \
    software-properties-common \
    vim \
    unzip \
    zip \
    libatomic1 \
    locales \
    mysql-client \
    && rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 配置语言环境
RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# 设置默认shell为bash
ENV SHELL /bin/bash

# 创建工作目录
WORKDIR /workspace