<div align="center">
  <h1>MLMap</h1>
  <h3>MLMap - Project Mapping Online Tool</h3>
  <img src="https://img.shields.io/badge/Typescript-purple?style=for-the-badge&logo=typescript&logoColor=white"/> 
  <a href="https://github.com/FJRG2007"> <img alt="GitHub" src="https://img.shields.io/badge/GitHub-purple?style=for-the-badge&logo=github&logoColor=white"/></a>
  <a href="https://ko-fi.com/fjrg2007"> <img alt="Kofi" src="https://img.shields.io/badge/Ko--fi-purple?style=for-the-badge&logo=ko-fi&logoColor=white"></a>
  <br />
  <br />
  <a href="https://fjrg2007.github.io/mlmap/demo/">Demo</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://fjrg2007.github.io/mlmap/examples/three-js-demo">Example with Three.js</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://tpe.li/dsc">Discord</a>
  <br />
  <hr />
</div>

![mlmap animation](https://github.com/FJRG2007/mlmap/raw/refs/heads/main/demo/three-js-demo/mlmap.gif "MLMap JS")

Online tool for project mapping based on JavaScript executed on the client.

> [!IMPORTANT]
> The project is still in development, so there may be some bugs or errors.

### Usage:

When you include `mlmap.min.js` in your page, a new class named `MLMap` is defined. The first step is to instantiate Maptastic, which can be done a couple of different ways depending on your needs. For most simple cases, this only requires a _single line of code_.

[SHOW ME THE DEMO](https://fjrg2007.github.io/mlmap/demo/)

```html
<html>
    <head>
		<style>
			body {
        		background: black;
        	}
			
			#so-simple {
				width: 300px;
				height: 300px;
				background: green;
			}
		</style>
	</head>
	<body>
		<div id="so-simple">This is pretty simple.</div>
		<script src="mlmap.min.js"></script>
		<script>
			new MLMap({
				layers: ["so-simple"]
			});
		</script>
    </body>
</html>
```

#### Author
 - FJRG007
 - Email: [fjrg2007@tpeoficial.com](mailto:fjrg2007@tpeoficial.com)

#### License
The founder of the project, [FJRG2007](https://github.com/FJRG2007/), reserves the right to modify the license at any time.
This project is licensed under the terms of the [Apache-2.0](./LICENSE).

<p align="right"><a href="#top">Back to top 🔼</a></p>