#!/bin/bash

start_time=$(date +%s) 

clear
npm run to-ms-store

end_time=$(date +%s)

duration=$((end_time - start_time))

minutes=$(( (duration % 3600) / 60 ))
seconds=$((duration % 60))

echo "构建总时长：$minutes 分钟 $seconds 秒"

