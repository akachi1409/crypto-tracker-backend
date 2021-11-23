const express = require("express");
const { ethers } = require("ethers");
const cors = require("cors");
const bodyParser = require('body-parser');

const contractAbiFragment = [
    'function balanceOf(address owner) external view returns (uint)',
    'function symbol() external pure returns (string memory)',
    'function decimals() external pure returns (uint8)', 
    'function getTotalDividendsDistributed() external view returns (uint256)', 
    'function getAccountDividendsInfo(address account) external view returns (address,int256,int256,uint256,uint256,uint256,uint256,uint256 )', 
    'function totalSupply() external view returns (uint256)', 
    'function price0CumulativeLast() external view returns (uint)'
]

const app = express();
// app.use(cors());

app.use(
    cors({
    origin: [/.*.*/]
    })
  ); 

app.options("*", cors());


app.use(bodyParser());

const CoinMarketCap = require('coinmarketcap-api')
 
const apiKey = 'e0760556-4021-485f-b2d6-31d90886fa4e'
const client = new CoinMarketCap(apiKey)
 
app.get("/", (req, res)=>{
    res.json("Hello");
})
app.post('/api/search', async (req, res) => {
    const token = req.body.token;
    const wallet = req.body.wallet;
    console.log(token, wallet);
    var balanceWei = 0;
    var data="";
    let symbol ="";
    //token: 0xae2df9f730c54400934c06a17462c41c08a06ed8
    //wallet: 0xE4bcC45E3231397042a5D8091D0967217D25A0C3
    const provider = getJsonProvider();
    try{
        let contract = new ethers.Contract(token, contractAbiFragment, provider);
        var balance =await  contract.balanceOf(wallet) ;
        console.log("B:", balance);
        balanceWei = parseInt(balance._hex, 16) 
        symbol = await contract.symbol();
        console.log(symbol);
        
        await client.getMetadata({symbol: symbol})
        .then((res)=>{
            data = res.data[symbol].description;
        })
        .catch((err)=>{
            console.log("It seemed that the token is not verified yet.")
        })
    }
    catch(e){
        console.log("Error:", e);
    }
    console.log("data:",data);
    var price = 0;
    if (data != ""){
        let temp1 = data.split("last known price of")[1];
        console.log("Temp1:", temp1);
        let temp2 = temp1.split("is ")[1]
        let temp3 = temp2.split(" USD")[0]
        price = temp3
    }
    const result = {
        description: data,
        balance: balanceWei,
        price : price,
        coin: symbol
    }
    res.json(result);
});

app.get('/getinitialdata', async (req, res) => {
    const provider = getJsonProvider();
    let contract = new ethers.Contract("0x8e7cb645529d08d878afbc8eb85942f14fdeea4a", contractAbiFragment, provider);
    let decimals = await contract.decimals();
    // let price = await contract.price0CumulativeLast();
    let totalSupply = await contract.totalSupply();
    let totalSupplyDecimal = parseFloat(ethers.utils.formatUnits(totalSupply, decimals));
    
    return res.json({
        totalSupplyDecimal, 
        decimals
    })
})

app.post('/getdata', async (req, res) => {

    // return {
    //     address: "0x983837282823838"
    // }

    const provider = getJsonProvider();
    const address = req.body.address;
    let contract = new ethers.Contract("0x8e7cb645529d08d878afbc8eb85942f14fdeea4a", contractAbiFragment, provider);
    let decimals = await contract.decimals();
    let balance = await contract.balanceOf(address);
    let symbol = await contract.symbol();
    // total rewards
    let totaldividensdistributed = await contract.getTotalDividendsDistributed();
    let totaldividensdistributeddecimal = parseFloat(ethers.utils.formatUnits(totaldividensdistributed, decimals));
    let tokenBalance = await parseFloat(ethers.utils.formatUnits(balance, decimals));
    // rewards info
    let rewardsinfo = await contract.getAccountDividendsInfo(address);

    return res.json({
        tokenBalance, 
        totaldividensdistributeddecimal, 
        rewardsinfo
    });
})


/*******  Custom Functions  ********/
function getJsonProvider() {
    // return new JsonRpcProvider(CURRENT_ENV == ENV.PRD 
    //   ? 'https://bsc-dataseed1.ninicoin.io': 'https://data-seed-prebsc-1-s1.binance.org:8545');

    return new ethers.providers.JsonRpcProvider('https://bsc-dataseed1.ninicoin.io');
}

function JsonRpcProvider(URL) {
    return new ethers.providers.JsonRpcProvider(URL);
}

app.listen(process.env.PORT || 5000, () => console.log('Server is listening on port 5000.'));