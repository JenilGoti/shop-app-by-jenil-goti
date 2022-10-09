const Product = require('../models/product');
const {
  validationResult
} = require('express-validator');
const {
  NULL
} = require('mysql2/lib/constants/types');

const mongoose = require('mongoose');

const fileHelper = require('../util/file');

const ITEM_PER_PAGE = 2;


exports.getAddProduct = (req, res, next) => {

  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    product: {},
    errorMessage: null
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
  console.log(image);
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not an image'
    });
  }
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        image: image,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg
    });
  } else {
    const imageUrl = '/' + image.path;
    const product = new Product({
      // _id: new mongoose.Types.ObjectId('6332ed19bd50094a7624b98d'),
      title: title,
      price: price,
      description: description,
      imageUrl: imageUrl,
      userId: req.user
    });
    product
      .save()
      .then(result => {
        // console.log(result);
        console.log('Created Product');
        res.redirect('/admin/products');
      })
      .catch(err => {
        // return res.status(500).render('admin/add-product', {
        //   pageTitle: 'Add Product',
        //   path: '/admin/add-product',
        //   editing: false,
        //   hasError: true,
        //   product: {
        //     title: title,
        //     imageUrl: imageUrl,
        //     price: price,
        //     description: description
        //   },
        //   errorMessage: errors.array()[0].msg
        // });
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  }
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: true,
        product: product,
        hasError: false,
        errorMessage: ''
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        imageUrl: updatedImageUrl,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg
    });
  }

  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl.substr(1));
        product.imageUrl = '/' + image.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

};

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  // console.log(page);
  let totalItom;
  // console.log(page);
  Product.find({
      userId: req.user._id
    }).countDocuments().then(numProducts => {
      totalItom = numProducts;
      return Product.find({
          userId: req.user._id
        })
        // .select('title price -_id')
        // .populate('userId', 'name')
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(products => {
      // console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        totalProducts: totalItom,
        currentPage: page,
        hasNextPage: ITEM_PER_PAGE * page < totalItom,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItom / ITEM_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then(product => {
      if (!product) {
        return next(new Error('Product not found'))
      }
      fileHelper.deleteFile(product.imageUrl.substr(1));
      return Product.findOneAndRemove({
        _id: prodId,
        userId: req.user._id
      })
    })
    .then((result) => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({message:'Success!'});
    })
    .catch(err => {
      res.status(500).json({message:'deleting product faild.'});
    });
};