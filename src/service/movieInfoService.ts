import { Dictionary } from "@/interface/common";

export type MovieInfoCache = {
  base: Dictionary<any>;
  ratings: Dictionary<any>;
  doubanToIMDb: Dictionary<any>;
};

/**
 * 电影信息
 */
export class MovieInfoService {
  // 豆瓣
  public doubanApiURL = "https://api.douban.com/v2";
  // 用于加载评分信息
  public omdbApiURL = "https://www.omdbapi.com";
  // 用于获取IMDbID
  public omitApiURL = "https://omit.mkrobot.org";
  // omdbapi 申请的Key列表
  // 每个 key 一天有1000次请求限制
  public omdbApiKeys = [
    "e0d3039d",
    "a67d9bce",
    "6be019fc",
    "4ee790e0",
    "d82cb888",
    "d58193b6",
    "15c0aa3f",
    "53acf36d",
    "3a864b75",
    "2892ab46",
    "b507af90",
    "7cf67120",
    "85b2a90c",
    "2896ff0a",
    "aa4b9983",
    "c4e08870",
    "5d5c0049",
    "79a462f2",
    "e4c3fce8",
    "918d70df",
    "e94cb667",
    "eb84d6d7",
    "e192b5a",
    "d62b4cf5",
    "5e6442a3",
    "9b1468c6"
  ];
  // 豆瓣 apikey
  public doubanApiKeys = [
    "02646d3fb69a52ff072d47bf23cef8fd",
    "0b2bdeda43b5688921839c8ecb20399b",
    "0dad551ec0f84ed02907ff5c42e8ec70",
    "0df993c66c0c636e29ecbb5344252a4a",
    "07c78782db00a121175696889101e363"
  ];

  // 仅用于 search 接口
  // 部分key无法用于 search 接口，故将key分开
  public doubanEntApiKeys = [
    "0dad551ec0f84ed02907ff5c42e8ec70",
    "02646d3fb69a52ff072d47bf23cef8fd",
    "07c78782db00a121175696889101e363"
  ];

  // 信息缓存
  public cache: MovieInfoCache = {
    base: {},
    ratings: {},
    doubanToIMDb: {}
  };

  // 链接超时时间
  public timeout = 3000;

  private requsetQueue: Dictionary<any> = {};

  public getInfos(key: string): Promise<any> {
    if (/^(tt\d+)$/.test(key)) {
      return this.getInfoFromIMDb(key);
    }

    return new Promise<any>((resolve?: any, reject?: any) => {
      reject("暂未实现");
    });
  }

  /**
   * 判断是否为 IMDbId
   * @param IMDbId
   */
  public isIMDbId(IMDbId: string): boolean {
    return /^(tt\d+)$/.test(IMDbId);
  }

  /**
   * 根据指定的 IMDbId 获取电影信息
   * @param IMDbId
   */
  public getInfoFromIMDb(IMDbId: string): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      if (this.isIMDbId(IMDbId)) {
        let cache = this.cache.base[IMDbId];
        if (cache) {
          resolve(cache);
          return;
        }
        let url = `${
          this.doubanApiURL
        }/movie/imdb/${IMDbId}?apikey=${this.getDoubanApiKey()}`;

        $.ajax({
          url: url,
          timeout: this.timeout
        })
          .done(json => {
            this.cache.base[IMDbId] = json;
            resolve(json);
          })
          .fail(error => {
            reject(error);
          });
      } else {
        reject("error IMDbId");
      }
    });
  }

  /**
   * 根据豆瓣ID获取影片信息
   * @param id
   */
  public getInfoFromDoubanId(id: string): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      if (/^(\d+)$/.test(id)) {
        let cache = this.cache.base[id];
        if (cache) {
          resolve(cache);
          return;
        }
        let url = `${
          this.doubanApiURL
        }/movie/subject/${id}?apikey=${this.getDoubanApiKey()}`;

        $.ajax({
          url: url,
          timeout: this.timeout
        })
          .done(json => {
            this.cache.base[id] = json;
            resolve(json);
          })
          .fail(error => {
            reject(error);
          });
      } else {
        reject("error douban id");
      }
    });
  }

  /**
   * 获取评分信息
   * @param IMDbId
   */
  public getRatings(IMDbId: string): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      if (this.isIMDbId(IMDbId)) {
        let cache = this.cache.ratings[IMDbId];
        if (cache) {
          resolve(cache);
          return;
        }

        let requestCount = 0;
        const request = () => {
          // 每个Key 1000 一天的限制
          let apikey = this.getOmdbApiKey();
          let url = `${this.omdbApiURL}/?i=${IMDbId}&apikey=${apikey}&tomatoes=true`;
          $.ajax({
            url: url,
            timeout: this.timeout
          })
            .done(json => {
              // 当发生错误时，更换Key进行重试
              if (json && json.Error) {
                requestCount++;
                if (requestCount >= 5) {
                  reject(json);
                  return;
                }
                this.removeApiKey("omdb", apikey);
                request();
                return;
              }
              this.cache.ratings[IMDbId] = json;
              resolve(json);
            })
            .fail(error => {
              reject(error);
            });
        };
        request();
      } else {
        reject("error IMDbId");
      }
    });
  }

  /**
   * 从OMDb apikey列表中随机获取一个key
   */
  public getOmdbApiKey() {
    // 随机获取一个key
    return this.omdbApiKeys[
      Math.floor(Math.random() * this.omdbApiKeys.length)
    ];
  }

  /**
   * 从豆瓣apikey列表中随机获取一个key
   */
  public getDoubanApiKey() {
    // 随机获取一个key
    return this.doubanApiKeys[
      Math.floor(Math.random() * this.doubanApiKeys.length)
    ];
  }

  /**
   * 获取用于查询的apikey
   */
  public getDoubanEntApiKey() {
    // 随机获取一个key
    return this.doubanEntApiKeys[
      Math.floor(Math.random() * this.doubanEntApiKeys.length)
    ];
  }

  /**
   * 根据指定的 doubanId 获取 IMDbId
   * @param doubanId
   */
  public getIMDbIdFromDouban(doubanId: string): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      let cache = this.cache.doubanToIMDb[doubanId];
      if (cache) {
        resolve(cache);
        return;
      }
      let url = `${this.omitApiURL}/movie/${doubanId}/douban/imdb`;

      if (this.requsetQueue[url]) {
        reject();
        return;
      }

      this.requsetQueue[url] = true;

      $.ajax({
        url: url,
        timeout: this.timeout
      })
        .done(json => {
          console.log("getIMDbIdFromDouban", json);
          if (json.data) {
            this.cache.doubanToIMDb[doubanId] = json.data;
            resolve(json.data);
          } else {
            reject(json);
          }
        })
        .fail(error => {
          reject(error);
        })
        .always(() => {
          delete this.requsetQueue[url];
        });
    });
  }

  /**
   * 查询指定关键的影片信息
   * @param key
   * @param count
   */
  public queryMovieInfoFromDouban(
    key: string,
    count: number = 5
  ): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      let url = `${
        this.doubanApiURL
      }/movie/search?q=${key}&count=${count}&apikey=${this.getDoubanEntApiKey()}`;
      $.ajax({
        url: url,
        timeout: this.timeout
      })
        .done((result: any) => {
          console.log("query", result);
          if (result.subjects) {
            resolve(result);
          } else {
            reject(result);
          }
        })
        .fail(error => {
          reject(error);
        });
    });
  }

  /**
   * 追加API Key
   * @param type
   * @param keys
   */
  public appendApiKey(type: string = "", keys: string[]) {
    let apiKeys: string[];
    switch (type) {
      case "omdb":
        apiKeys = this.omdbApiKeys;
        break;

      case "douban":
        apiKeys = this.doubanApiKeys;
        break;
    }

    keys.forEach(key => {
      if (key && !apiKeys.includes(key)) {
        apiKeys.push(key);
      }
    });
  }

  /**
   * 移除指定的Key
   * @param type
   * @param key
   */
  private removeApiKey(type: string = "", key: string) {
    let apiKeys: string[] = [];
    switch (type) {
      case "omdb":
        apiKeys = this.omdbApiKeys;
        break;

      case "douban":
        apiKeys = this.doubanApiKeys;
        break;
    }

    let index = apiKeys.findIndex(item => {
      if (item === key) {
        return true;
      }
    });

    if (index !== -1) {
      apiKeys.splice(index, 1);
    }
  }

  /**
   * 验证 OMDB API Key
   * @param key
   */
  public verifyOmdbApiKey(key: string): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      let url = `${this.omdbApiURL}/?i=tt0111161&apikey=${key}&tomatoes=true`;

      $.ajax({
        url: url,
        timeout: this.timeout
      })
        .done(json => {
          if (json && json.Error) {
            reject(json.Error);
            return;
          }
          resolve();
        })
        .fail(error => {
          reject(error);
        });
    });
  }

  /**
   * 验证豆瓣Api Key
   * @param key
   */
  public verifyDoubanApiKey(key: string): Promise<any> {
    return new Promise<any>((resolve?: any, reject?: any) => {
      let url = `${this.doubanApiURL}/movie/imdb/tt0111161?apikey=${key}`;

      $.ajax({
        url: url,
        timeout: this.timeout
      })
        .done(json => {
          if (json && json.title) {
            resolve();
          } else {
            reject(json.Error);
          }
        })
        .fail(error => {
          reject(error);
        });
    });
  }
}
