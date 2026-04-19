# Docker — вопросы для самопроверки

## Docker basics

1. Что такое Docker image и чем он отличается от container?
2. Что такое слой (layer) в Docker image?
3. Что делает команда `docker build`? Что она принимает на вход?
4. Чем отличается `docker run` от `docker compose up`?
5. Что такое build context и как `.dockerignore` на него влияет?

## Dockerfile

6. Чем отличается `CMD` от `ENTRYPOINT`?
7. Что произойдёт, если в Dockerfile есть и `CMD`, и `ENTRYPOINT`?
8. Чем отличается `COPY` от `ADD`?
9. Что делает `EXPOSE`? Открывает ли он порт наружу?
10. Зачем нужен multi-stage build? Что происходит с промежуточными stage?
11. Почему `COPY package*.json` делают отдельно от `COPY . .`?
12. Зачем нужен `USER node`? От чего он защищает?
13. Чем `RUN`, `CMD` и `ENTRYPOINT` отличаются друг от друга?

## Docker networking

14. Как два контейнера в одном compose-файле видят друг друга?
15. Что такое bridge network в Docker?
16. Почему внутри compose `app` может обращаться к `db` по имени `db`, а не по IP?
17. Что такое `localhost` внутри контейнера? Это тот же `localhost`, что на хосте?
18. Может ли один контейнер достучаться до другого через `localhost`?

## Ports

19. Что означает `"4000:4000"` в compose? Какая часть хост, какая контейнер?
20. Что будет, если убрать `ports` у сервиса? Сможет ли другой контейнер достучаться?
21. Чем отличается `EXPOSE` в Dockerfile от `ports` в compose?

## Volumes

22. Что произойдёт с данными PostgreSQL, если удалить контейнер, но не volume?
23. Чем отличается named volume от bind mount?
24. Зачем в compose секция `volumes:` на верхнем уровне?

## Environment variables

25. Чем отличается `env_file` от `environment` в compose?
26. Чем отличается `ENV` в Dockerfile от переменных, переданных через `docker run --env`?
27. Что такое `${VARIABLE}` и `$$VARIABLE` в compose-файле?
28. Почему `.env` не стоит копировать внутрь Docker image?

## npm / Node.js в Docker

29. Чем отличается `npm install` от `npm ci`?
30. Что делает `npm ci --omit=dev`?
31. Почему в production Docker image не нужен Nest CLI?
32. Почему `CMD ["node", "dist/main"]`, а не `CMD ["npm", "run", "start"]`?

## Security

33. Почему контейнер лучше запускать не от root?
34. Что будет, если вредоносный пакет выполнит postinstall-скрипт в build stage?
35. Можно ли достать секрет из промежуточного слоя Docker image?

## Shell basics (для healthcheck и CI)

36. Что делает `|` (pipe)?
37. Что такое exit code? Что означает `0` и `1`?
38. Что такое `/dev/null`?
39. Чем отличается `>` от `>>`?
40. Что означает `||` в shell-команде?
